# VOGNIX – Premium Fashion E-Commerce Platform

> **Internship Assessment Project**: Full-Stack Production-Grade Fashion E-Commerce Application  
> Inspired by the Discovery and Checkout Experience of Myntra

[![Backend: Java 17](https://img.shields.io/badge/Backend-Java%2017-orange.svg)](https://www.oracle.com/java/)
[![Framework: Spring Boot 3.3](https://img.shields.io/badge/Framework-Spring%20Boot%203.3.0-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Frontend: React 18](https://img.shields.io/badge/Frontend-React%2018%20+%20Vite-blue.svg)](https://react.dev/)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%203-38bdf8.svg)](https://tailwindcss.com/)
[![Database: MySQL 8 / H2 Mode](https://img.shields.io/badge/Database-MySQL%208%20%7C%20H2%20File-yellow.svg)](https://www.mysql.com/)
[![Migrations: Flyway](https://img.shields.io/badge/Migrations-Flyway-red.svg)](https://flywaydb.org/)
[![API Docs: Swagger / OpenAPI 3](https://img.shields.io/badge/API%20Docs-Swagger%20UI-green.svg)](http://localhost:8080/swagger-ui.html)

---

## 1. Project Overview

**VOGNIX** is an end-to-end, full-stack luxury fashion commerce web application designed with editorial aesthetics, high-performance catalog discovery, multi-faceted filtering, real-time database-backed cart and wishlist management, dual-mode simulated Sandbox + optional Razorpay Test Mode checkout, atomic inventory reservations, order lifecycle state machines, and an administrative control portal.

Unlike static mockups, every single UI action connects directly to secure REST endpoints, backed by persistent database transactions, pessimistic row locking, and administrative audit trails.

---

## 2. Key Architectural Highlights & Engineering Excellence

- **Zero-Setup Database Out-of-the-Box**: Configured by default with a persistent, file-based H2 database operating in **MySQL compatibility mode** (`./data/vognixdb`), allowing examiners and evaluators to run the application immediately without local MySQL server prerequisites. A seamless switch to MySQL 8 is provided via `--spring.profiles.active=mysql`.
- **Atomic Stock Reservation & Concurrency Control**: Payment checkout reserves stock under JPA pessimistic write locks; stock is committed only after verified capture, or immediately for COD.
- **Dual-Mode Payment Checkout (Zero-Setup Sandbox + Optional Razorpay Test Mode)**: Out-of-the-box, when external gateway credentials are not configured, VOGNIX uses an interactive **Sandbox Payment Gateway** supporting UPI, Card, NetBanking, and Wallet with explicit `PAID`, `FAILED`, `PENDING`, and `Retry` simulation backed by real database transactions. Setting `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` switches online checkout seamlessly to verified Razorpay Test Mode with Checkout signature verification and idempotent signed webhooks.
- **Idempotency Protection**: Order and payment creation support `X-Idempotency-Key`; database uniqueness guarantees prevent duplicate orders or duplicate payment attempts for the same key.
- **Order Lifecycle State Machine**: Enforces valid transitions across `PENDING_PAYMENT`, `PAYMENT_FAILED`, `PLACED`, `PAID`, `PACKED`, `SHIPPED`, `DELIVERED`, and `CANCELLED`. Order cancellations and payment failures execute automated inventory restorations inside transactional boundaries.
- **Role-Based Access Control (RBAC)**: Secure stateless JWT authentication via Spring Security 6 (`ROLE_CUSTOMER` and `ROLE_ADMIN`). Unauthorized API requests receive appropriate HTTP 401/403 responses.
- **Administrative Audit Logging**: All sensitive mutations (product creation, catalog deactivation, stock modifications, order status transitions, coupons) produce immutable audit records with actor email, timestamp, and IP address.
- **Interactive OpenAPI / Swagger Documentation**: Full interactive Swagger UI available at `http://localhost:8080/swagger-ui.html`.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom editorial typography and animations
- **Routing**: React Router DOM v6 (with `ProtectedRoute` and `AdminRoute` guards)
- **State & Context**: Context API (`AuthContext`, `CartContext`, `WishlistContext`, `ToastContext`)
- **HTTP Client**: Axios with automatic JWT injection and error interceptors
- **Icons**: Lucide React
- **Testing**: Vitest + `@testing-library/react` + `@testing-library/jest-dom`

### Backend
- **Language**: Java 17 (LTS)
- **Framework**: Spring Boot 3.3.0
- **Security**: Spring Security 6 + JJWT 0.12.5 (Stateless Bearer Tokens)
- **Persistence**: Spring Data JPA + Hibernate ORM
- **Database Migrations**: Flyway (V1 schema, V2 seed data, V3 Razorpay payments and webhook event tracking)
- **Payment Gateway**: Razorpay Java SDK and Razorpay Checkout (Test Mode; secret keys stay on the backend)
- **Documentation**: Springdoc OpenAPI 2.5.0 (Swagger UI)
- **Testing**: JUnit 5 + Mockito + Spring Boot Test

### Database
- **Development / Evaluation**: File-backed Persistent H2 in MySQL mode (`jdbc:h2:file:./data/vognixdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1`)
- **Production Option**: MySQL 8.0+ (`jdbc:mysql://localhost:3306/vognix_db`)

---

## 4. Default Seed Credentials

The application initializes with predefined demo accounts for immediate testing:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@vognix.com` | `Admin@123` | Full Admin Console (`/admin`), KPI Dashboard, Catalog CRUD, Stock Control, Order Fulfillment, Coupons, Audit Trails |
| **Customer** | `customer@vognix.com` | `Customer@123` | Storefront discovery, Profile, Address Book CRUD, Cart, Wishlist, Checkout, Tracking, Reviews |

- **Admin Portal Login (`/admin/login`)** and **Customer Login (`/login`)** both support standard credentials as well as optional demo quick-fill shortcuts for rapid evaluation.

---

## 5. Getting Started & Execution Instructions

### Prerequisites
- **Java Development Kit (JDK)**: Version 17 or higher
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- **Git**

---

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd "VOGNIX – Premium Fashion E-Commerce Platform"
```

---

### Quick Start on Windows (1 Command)
Double-click [`start-vognix.bat`](start-vognix.bat) or run from the project root:
```bat
start-vognix.bat
```
This launches both the Spring Boot backend (`:8080`) and Vite React frontend (`:5173`) together so registration, cart, checkout, and admin routes connect automatically.

---

### Step 2: Run Backend (Spring Boot)

The backend is configured to run out-of-the-box with persistent H2 in MySQL mode. No database installation is required!

```bash
cd backend
mvn clean package -DskipTests
java -jar target/vognix-backend-1.0.0.jar
```

*Or run with Maven directly:*
```bash
cd backend
mvn spring-boot:run
```

- **Backend Base URL**: `http://localhost:8080`
- **Interactive Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON Spec**: `http://localhost:8080/api-docs`

#### Configure Razorpay Test Mode

1. Sign in to the [Razorpay Dashboard](https://dashboard.razorpay.com/) and switch to **Test Mode**.
2. Under **Account & Settings → API Keys**, generate Test Mode keys. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the backend process. Never use Live Mode keys for local tests.
3. Use `.env.example` as a reference. Spring Boot does not automatically load the root `.env` file. In PowerShell, for example:

   ```powershell
   $env:RAZORPAY_KEY_ID="rzp_test_your_key_id"
   $env:RAZORPAY_KEY_SECRET="your_test_key_secret"
   $env:RAZORPAY_WEBHOOK_SECRET="your_webhook_signing_secret"
   cd backend
   mvn spring-boot:run
   ```

4. Use only Razorpay's official [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/) and [Test UPI IDs](https://razorpay.com/docs/payments/payments/test-upi-details/) in Checkout. `success@razorpay` tests UPI success and `failure@razorpay` tests UPI failure. Test card flows use the random CVV, future expiry date, and test OTP specified by Razorpay. No real charge is made with Test Mode keys.

#### Test Webhooks Locally

Razorpay needs a public HTTPS endpoint; the dashboard cannot reach `localhost`. Start the backend and run `ngrok http 8080`. In **Account & Settings → Webhooks**, add `https://<your-ngrok-host>/api/payments/webhook`, subscribe to `payment.captured`, `payment.failed`, and `order.paid`, and configure a webhook signing secret. Set that exact value as `RAZORPAY_WEBHOOK_SECRET` and restart the backend. Complete a Test Mode checkout and confirm the signed webhook updates the payment/order. Duplicate event IDs are ignored. See [Razorpay Webhooks](https://razorpay.com/docs/webhooks/) for setup details. The webhook secret is separate from the API key secret.

*(Optional) To run against an existing local MySQL 8 server:*
```bash
java -jar target/vognix-backend-1.0.0.jar --spring.profiles.active=mysql
```
*(See `DATABASE_SETUP.md` for MySQL schema setup).*

---

### Step 3: Run Frontend (React + Vite)

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

- **Frontend Application URL**: `http://localhost:5173`

The Vite dev server automatically proxies all `/api` requests to `http://localhost:8080`.

---

## 6. Running Tests

### Backend Test Suite (JUnit 5 + Mockito)
```bash
cd backend
mvn test
```
*Executes unit and integration tests including authentication, cart calculation, pessimistic stock locking, payment signature and amount rejection, duplicate webhook handling, order cancellation stock recovery, and security role authorization.*

### Frontend Test Suite (Vitest + React Testing Library)
```bash
cd frontend
npm test
```
*Validates product card rendering, discount pill calculations, wishlist button triggers, and shopping bag context operations.*

### Frontend Production Build
```bash
cd frontend
npm run build
```

---

## 7. Application Features & User Journeys

### 🛍️ Customer Journey
1. **Interactive Homepage**:
   - Curated Hero Carousel with fashion banners.
   - Trending and Featured Product rows.
   - Category exploration tiles (Men, Women, Kids, Footwear, Accessories).
2. **Product Discovery & Multi-Faceted Filtering**:
   - Search query matching title, description, brand, or category.
   - Category filter pills.
   - Gender filtering (Men, Women, Unisex, Kids).
   - Dynamic price range sliders (₹500 &ndash; ₹20,000).
   - Brand checkboxes with live counts.
   - Multi-option sorting (Newest, Price: Low to High, Price: High to Low, Customer Rating).
3. **Product Detail Experience**:
   - High-definition image gallery with thumbnail preview.
   - Dynamic variant picker (Sizes: S, M, L, XL; Colors with visual color swatches).
   - Real-time inventory status ("In Stock", "Only X left", "Out of Stock").
   - Customer review breakdown with 5-star ratings and verified buyer badges.
   - Write review modal with star ratings and comments.
4. **Wishlist**:
   - Persistent wishlist synced to the database.
   - 1-click "Move to Bag" action.
5. **Shopping Bag & Coupon Engine**:
   - Item quantity controls (`+` / `-`) with dynamic stock validation.
   - Item removal.
   - Real-time coupon application (`VOGNIX10` for 10% off, `FIRST500` flat ₹500 off, `FESTIVE20` for 20% off, `FREESHIP` flat ₹100 off).
   - Transparent price breakdown (Subtotal, Discount, Estimated Tax, Free Delivery above ₹999).
6. **Address Book Management**:
   - Multiple addresses per customer (Home, Work, Other).
   - Add, edit, delete, and set default delivery address.
7. **Checkout & Payment**:
   - Multi-step checkout with address selection.
   - Dual-mode online checkout supporting VOGNIX's interactive Sandbox Payment Gateway (for UPI, Card, NetBanking, Wallets with success, failure, pending, and retry testing) plus optional Razorpay Checkout in Test Mode; Cash on Delivery remains independent of online payment configuration.
   - Automatic idempotency token generation to prevent duplicate deductions.
8. **Order Tracking & Management**:
   - Order history with full order breakdown.
   - Visual 5-stage shipment timeline (`Placed` &rarr; `Paid` &rarr; `Packed` &rarr; `Shipped` &rarr; `Delivered`).
   - Self-service order cancellation with immediate atomic inventory restoration.

---

### 👑 Administrator Portal (`/admin` &amp; `/admin/login`)
1. **Dedicated Admin Sign-In (`/admin/login`)**:
   - Role-verified authentication (`ROLE_ADMIN` required; customer accounts are rejected cleanly).
2. **Executive Dashboard (`/admin/dashboard`)**:
   - Real-time KPI metrics: Total Gross Revenue, Total Orders, Delivered Orders, Customer Count, Catalog Products.
   - Low-Stock Watchlist alerting when variants fall below safety threshold (&le; 5 units).
   - Recent customer purchase orders table.
3. **Product Catalog Management (`/admin/products`)**:
   - Searchable catalog table showing active/inactive status, primary thumbnails, brand, category, base/discounted prices, and featured flags.
   - **Add &amp; Edit Product Modals**: Edit existing products, pricing, descriptions, images, and variant stock/color swatches, or publish new items and toggle Active/Inactive visibility.
4. **Categories &amp; Brands (`/admin/categories`)**:
   - Manage parent/child storefront categories and designer brands (create, edit, activate/deactivate).
5. **Order Lifecycle Control (`/admin/orders`)**:
   - Filter customer orders across every lifecycle state (`ALL`, `PENDING_PAYMENT`, `PLACED`, `PAID`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `PAYMENT_FAILED`).
   - Expandable order drawer displaying line items, customer email, shipping address snapshot, and transaction IDs.
   - **Transition-Validated Status Modal**: Only valid next transitions allowed by the backend state machine can be submitted, with admin audit remarks.
   - Review payment status and mark COD payments as collected when cash has been received.
6. **Inventory &amp; Warehouse Stocking (`/admin/inventory`)**:
   - Safety buffer monitoring highlighting critical variants and quick variant stock adjustments synced directly with database inventory.
7. **Customers &amp; Accounts (`/admin/customers`)**:
   - Searchable user directory with lifetime order counts, gross spend, role badges, and account suspension/activation controls.
8. **Coupons &amp; Promotional Vouchers (`/admin/coupons`)**:
   - List active vouchers with discount types (`PERCENTAGE`, `FLAT`), min spend, max discount cap, usage counts, and expiry dates, and deploy new vouchers.
9. **Sales &amp; Order Reports (`/admin/reports`)**:
   - Live breakdown of confirmed revenue, AOV, lifecycle status distributions, payment method/status volumes, and top-selling products.
10. **Security &amp; Event Audit Trail (`/admin/audit-logs`)**:
    - Immutable audit records documenting administrative mutations, stock changes, cancellations, and user actions.

---

## 8. API Endpoints Summary

| Group | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Customer registration |
| | `POST` | `/api/auth/login` | JWT login for Customer & Admin |
| | `POST` | `/api/auth/forgot-password` | Generate simulated security reset code |
| | `POST` | `/api/auth/reset-password` | Reset password using verification token |
| **User** | `GET` | `/api/users/profile` | Get current user profile |
| | `PUT` | `/api/users/profile` | Update user profile |
| | `GET` | `/api/users/addresses` | List saved addresses |
| | `POST` | `/api/users/addresses` | Create new delivery address |
| | `PUT` | `/api/users/addresses/{id}` | Update saved address |
| | `DELETE` | `/api/users/addresses/{id}` | Delete saved address |
| | `PUT` | `/api/users/addresses/{id}/default` | Set default shipping address |
| **Catalog** | `GET` | `/api/products` | Multi-faceted search & filter catalog |
| | `GET` | `/api/products/{id}` | Full product details with variants & reviews |
| | `GET` | `/api/products/featured` | Curated featured collection |
| | `GET` | `/api/categories` | Catalog category taxonomy |
| | `GET` | `/api/brands` | Official fashion brand list |
| | `POST` | `/api/products/{id}/reviews` | Submit product review & rating |
| **Cart** | `GET` | `/api/cart` | Get customer cart with applied coupon |
| | `POST` | `/api/cart/items` | Add variant to cart with stock validation |
| | `PUT` | `/api/cart/items/{id}` | Update quantity |
| | `DELETE` | `/api/cart/items/{id}` | Remove item from cart |
| | `POST` | `/api/cart/apply-coupon` | Validate & apply coupon code |
| **Wishlist**| `GET` | `/api/wishlist` | Get customer wishlist |
| | `POST` | `/api/wishlist/{productId}` | Toggle product in wishlist |
| | `POST` | `/api/wishlist/{productId}/move-to-cart` | Move wishlisted item to shopping bag |
| **Orders** | `POST` | `/api/checkout/validate` | Pre-flight checkout calculation |
| **Payments** | `POST` | `/api/payments/initiate` | Recalculate database cart total and initiate a Sandbox or Razorpay payment attempt |
| | `POST` | `/api/payments/create-order` | Alias of `/initiate` for checkout payment order creation |
| | `POST` | `/api/payments/confirm` | Confirm Sandbox payment outcome (`PAID`, `FAILED`, `PENDING`) |
| | `POST` | `/api/payments/verify` | Verify Razorpay Checkout signature and provider payment details |
| | `POST` | `/api/payments/webhook` | Process signed `payment.captured`, `payment.failed`, and `order.paid` events |
| | `GET` | `/api/payments/{paymentId}/status` | Get current user's payment status |
| | `POST` | `/api/payments/{paymentId}/retry` | Retry a failed or pending payment attempt |
| | `GET` | `/api/payments` | Get current user's payment history |
| | `POST` | `/api/payments/failure` | Record/confirm a failed Razorpay payment attempt |
| **Orders** | `POST` | `/api/orders` | Place a COD order (online orders use `/api/payments/initiate`) |
| | `GET` | `/api/orders` | Get user order history |
| | `GET` | `/api/orders/{id}` | Get specific order tracking details |
| | `PUT` | `/api/orders/{id}/cancel` | Cancel eligible order &amp; restore inventory |
| **Admin** | `GET` | `/api/admin/dashboard` | Executive KPIs and stock alerts |
| | `GET` | `/api/admin/products` | List all catalog products (including inactive) |
| | `POST` | `/api/admin/products` | Create product with variants |
| | `PUT` | `/api/admin/products/{id}` | Edit product details, pricing, images, and variants |
| | `DELETE` | `/api/admin/products/{id}` | Deactivate product |
| | `GET` | `/api/admin/categories` | List all categories |
| | `POST` / `PUT` / `DELETE` | `/api/admin/categories` | Create, edit, and deactivate categories |
| | `GET` / `POST` / `PUT` | `/api/admin/brands` | List, create, and edit brands |
| | `GET` | `/api/admin/customers` | List registered users with order counts and spend |
| | `PUT` | `/api/admin/customers/{id}/status` | Activate or suspend a user account |
| | `GET` | `/api/admin/orders` | View all customer orders with status filters |
| | `PUT` | `/api/admin/orders/{id}/status` | Transition order lifecycle status |
| | `PUT` | `/api/admin/payments/{paymentId}/cod-collected` | Mark a pending COD payment collected |
| | `PUT` | `/api/admin/inventory/{variantId}` | Adjust variant stock level |
| | `GET` | `/api/admin/coupons` | List all promotional vouchers |
| | `POST` | `/api/admin/coupons` | Create new promotional voucher |
| | `GET` | `/api/admin/reports` | Sales, status, payment method, and top product analytics |
| | `GET` | `/api/admin/audit-logs` | Administrative audit trail |

---

## 9. Known Limitations &amp; Assessment Notes

1. **Simulated Payment Default Mode**: Out-of-the-box without real `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` environment variables, online payments execute via the built-in **VOGNIX Sandbox Payment Gateway**, enabling realistic success, decline, pending, and retry workflows without exposing private payment credentials.
2. **Forgot Password Email Delivery**: Password reset generates an audited verification code stored via `AuthService` and displays instructions for demonstration without requiring an external SMTP relay server.
3. **External Image URLs**: Seeded product photography uses Unsplash URLs (`V2__seed_data.sql`); if the browser runs offline or behind strict egress blocking, an inline SVG VOGNIX atelier fallback image is rendered automatically.
4. **H2 Default Profile vs MySQL 8**: For zero-friction grading and testing, the default Spring profile persists to a file-backed H2 database configured in strict MySQL compatibility mode (`MODE=MySQL`). Production MySQL 8.0+ runs cleanly via `--spring.profiles.active=mysql`.

---

## 10. License

Developed for academic and internship assessment purposes. All fashion brand references and photography belong to their respective copyright holders.
