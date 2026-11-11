# VOGNIX – System Architecture & Engineering Specifications

This document outlines the software design patterns, security model, concurrency controls, idempotency mechanisms, and state machines implemented in the **VOGNIX** platform.

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    Client["Browser Client (React 18 + Vite SPA)"]
    
    subgraph Frontend Layer
        Router["React Router v6"]
        Context["Context State (Auth, Cart, Wishlist, Toast)"]
        Axios["Axios Client (JWT Interceptor)"]
    end
    
    subgraph Edge & Security
        Nginx["Vite Dev Proxy / Reverse Proxy"]
        SecFilter["Spring Security Filter Chain (JwtAuthenticationFilter)"]
    end
    
    subgraph Spring Boot Backend
        Controllers["REST Controllers (Auth, Product, Cart, Order, Admin)"]
        Services["Business Services (Pessimistic Locking & Idempotency)"]
        Repos["Spring Data JPA Repositories"]
    end
    
    subgraph Persistence Layer
        Flyway["Flyway Migration Engine (V1 Schema + V2 Seed Data)"]
        DB[("MySQL 8 / Persistent H2 in MySQL Mode")]
        IdempotencyStore[("idempotency_records Table")]
        AuditStore[("audit_logs Table")]
    end

    Client --> Router
    Router --> Context
    Context --> Axios
    Axios --> Nginx
    Nginx --> SecFilter
    SecFilter --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos --> DB
    Services --> IdempotencyStore
    Services --> AuditStore
    Flyway --> DB
```

---

## 2. Authentication & Authorization Flow

VOGNIX implements a stateless, token-based authentication mechanism using **JSON Web Tokens (JWT)** via JJWT `0.12.5` and Spring Security 6.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Admin
    participant React as React Frontend
    participant AuthCtrl as AuthController
    participant AuthMgr as AuthenticationManager
    participant JwtProvider as JwtTokenProvider
    participant SecFilter as JwtAuthenticationFilter

    Customer->>React: Enters credentials (or clicks 1-Click Demo Preset)
    React->>AuthCtrl: POST /api/auth/login {email, password}
    AuthCtrl->>AuthMgr: authenticate(UsernamePasswordAuthenticationToken)
    AuthMgr-->>AuthCtrl: Authentication Object (Validated)
    AuthCtrl->>JwtProvider: generateToken(Authentication)
    JwtProvider-->>AuthCtrl: Signed JWT Bearer Token
    AuthCtrl-->>React: AuthResponse {token, userId, email, roles}
    React->>React: Store token in localStorage (vognix_token)
    
    Note over Customer, SecFilter: Subsequent Protected Requests
    Customer->>React: Navigates to /checkout or /admin
    React->>SecFilter: GET /api/orders (Header: Authorization: Bearer <token>)
    SecFilter->>JwtProvider: validateToken(token) & getUsernameFromJWT(token)
    SecFilter->>SecFilter: Set SecurityContextHolder.setAuthentication(...)
    SecFilter->>AuthCtrl: Forward to protected controller endpoint
```

---

## 3. Order Lifecycle State Machine

The order lifecycle follows an explicit state transition machine. Only valid transitions are permitted, and cancellation triggers automated inventory restorations inside transactional boundaries.

```mermaid
stateDiagram-v2
    [*] --> PLACED: COD Order Submitted (Pessimistic Lock Deducts Stock)
    [*] --> PENDING_PAYMENT: Online Checkout Initiated (Reserves Stock)

    PENDING_PAYMENT --> PAID: Gateway Verified / Sandbox PAID (Deducts Stock)
    PENDING_PAYMENT --> PAYMENT_FAILED: Gateway Declined / Sandbox FAILED (Releases Reservation)

    PAYMENT_FAILED --> PAID: Retry Succeeded (Locks & Deducts Stock)
    PAYMENT_FAILED --> CANCELLED: Order Closed After Failure

    PLACED --> PAID: COD Collected / Marked Paid
    PLACED --> PACKED: Warehouse Packs COD Order
    PLACED --> SHIPPED: Dispatched Directly
    PLACED --> CANCELLED: Cancelled (Stock Restored)

    PAID --> PACKED: Warehouse Hub Fulfills & Boxes Order
    PAID --> SHIPPED: Express Dispatch
    PAID --> CANCELLED: Cancelled before Dispatch (Stock Restored)

    PACKED --> SHIPPED: Dispatched with Courier & Tracking Assigned
    PACKED --> CANCELLED: Cancelled before Dispatch (Stock Restored)

    SHIPPED --> DELIVERED: Reached Customer Doorstep

    DELIVERED --> [*]: Complete
    CANCELLED --> [*]: Closed
```

### State Transition Validation Table:

| Current Status | Permitted Next Statuses | Invariant / Side Effect |
| :--- | :--- | :--- |
| `PENDING_PAYMENT` | `PAID`, `PAYMENT_FAILED` | Stock reserved until payment resolves; cannot be cancelled while pending |
| `PAYMENT_FAILED` | `PAID`, `CANCELLED` | Reservation released; retry re-validates & deducts stock |
| `PLACED` | `PAID`, `PACKED`, `SHIPPED`, `CANCELLED` | COD order placed with inventory already deducted via pessimistic lock |
| `PAID` | `PACKED`, `SHIPPED`, `CANCELLED` | Payment confirmed in `payments` table |
| `PACKED` | `SHIPPED`, `CANCELLED` | Order boxed and labeled at warehouse |
| `SHIPPED` | `DELIVERED` | Handed over to logistics carrier |
| `DELIVERED` | None (Terminal) | Final fulfilled state |
| `CANCELLED` | None (Terminal) | Atomic rollback: stock restored to `inventory` |

---

## 4. Concurrency Control: Atomic Stock Reservation

To prevent overselling when multiple customers check out the same limited-stock variant concurrently, VOGNIX utilizes **JPA Pessimistic Write Locking** (`LockModeType.PESSIMISTIC_WRITE`).

### Implementation Details:
```java
@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.variant.id = :variantId")
    Optional<Inventory> findByVariantIdWithLock(@Param("variantId") Long variantId);
}
```

1. During `orderService.placeOrder(...)`, the database issues a `SELECT ... FOR UPDATE` row lock on the specific variant's inventory row.
2. The transaction inspects `stockQuantity >= requestedQuantity`.
3. If stock is insufficient, an `InsufficientStockException` is thrown, and Spring aborts the transaction immediately.
4. If stock is sufficient, the inventory is deducted and saved before releasing the row lock, guaranteeing zero negative inventory.

---

## 5. Network Failure & Double-Charge Protection: Idempotency Pattern

To guarantee that network timeouts, double clicks, or browser retries never place multiple orders or charge a card twice, VOGNIX supports client-generated `X-Idempotency-Key` headers.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend Client
    participant OrderSvc as OrderService
    participant IdemRepo as IdempotencyRecordRepository
    participant OrderRepo as OrderRepository

    Client->>OrderSvc: POST /api/orders (Header: X-Idempotency-Key: "uuid-9281")
    OrderSvc->>IdemRepo: findByKeyAndUserId("uuid-9281", userId)
    
    alt Key already exists in database
        IdemRepo-->>OrderSvc: Existing IdempotencyRecord found
        OrderSvc-->>Client: Returns cached OrderResponse (HTTP 200 OK without re-deducting stock)
    else Key is new
        OrderSvc->>OrderRepo: Executes order placement & stock deduction
        OrderSvc->>IdemRepo: Saves IdempotencyRecord with serialized response JSON
        OrderSvc-->>Client: Returns new OrderResponse (HTTP 201 Created)
    end
```

---

## 6. Audit Trail Architecture

All administrative changes and high-impact operations are captured in the `audit_logs` table via `AuditLogService.logAction(...)`.

Each record captures:
- `user_id` & `user_email`: The actor initiating the action.
- `action_type`: Standardized event constant (e.g. `PRODUCT_CREATED`, `ORDER_STATUS_UPDATED`, `INVENTORY_STOCK_UPDATED`, `COUPON_CREATED`).
- `entity_name` & `entity_id`: The domain entity affected (e.g. `Product`, `Order`, `Inventory`).
- `details`: Human-readable JSON or description of the modification.
- `ip_address`: Network IP address recorded from the HTTP servlet request.
- `created_at`: High-precision timestamp.
