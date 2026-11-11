# VOGNIX – Entity Relationship (ER) Diagram & Schema Specifications

The **VOGNIX** relational database schema is composed of **21 core normalized tables** (plus `payment_webhook_events` added in migration V3, 22 tables total) designed for high throughput, data integrity, atomic inventory tracking, and complete auditability.

---

## 1. Complete Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ user_roles : "assigned"
    roles ||--o{ user_roles : "belongs to"
    users ||--o{ user_addresses : "owns"
    users ||--o{ orders : "places"
    users ||--o1 carts : "maintains"
    users ||--o1 wishlists : "saves"
    users ||--o{ reviews : "authors"
    users ||--o{ audit_logs : "triggers"

    categories ||--o{ products : "classifies"
    categories ||--o{ categories : "parent of"
    brands ||--o{ products : "manufactures"

    products ||--o{ product_images : "showcases"
    products ||--o{ product_variants : "has"
    products ||--o{ reviews : "receives"
    products ||--o{ wishlist_items : "wishlisted in"

    product_variants ||--o1 inventory : "tracked by"
    product_variants ||--o{ cart_items : "added into"
    product_variants ||--o{ order_items : "purchased in"

    carts ||--o{ cart_items : "contains"
    wishlists ||--o{ wishlist_items : "contains"

    orders ||--o{ order_items : "includes"
    orders ||--o{ payments : "paid with"
    coupons ||--o{ orders : "discount applied"

    users {
        bigint id PK
        varchar email UK
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar phone
        varchar avatar_url
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    roles {
        bigint id PK
        varchar name UK
        varchar description
    }

    user_roles {
        bigint user_id PK,FK
        bigint role_id PK,FK
    }

    user_addresses {
        bigint id PK
        bigint user_id FK
        varchar address_type
        varchar full_name
        varchar phone
        varchar street_address
        varchar locality
        varchar city
        varchar state
        varchar postal_code
        boolean is_default
        timestamp created_at
    }

    categories {
        bigint id PK
        varchar name
        varchar slug UK
        text description
        bigint parent_id FK
        varchar image_url
        boolean is_active
    }

    brands {
        bigint id PK
        varchar name UK
        varchar slug UK
        varchar logo_url
        text description
        boolean is_active
    }

    products {
        bigint id PK
        varchar title
        varchar slug UK
        text description
        bigint brand_id FK
        bigint category_id FK
        varchar gender
        decimal base_price
        integer discount_percent
        decimal rating
        integer review_count
        boolean is_active
        boolean is_featured
    }

    product_images {
        bigint id PK
        bigint product_id FK
        varchar image_url
        integer display_order
        boolean is_primary
    }

    product_variants {
        bigint id PK
        bigint product_id FK
        varchar sku UK
        varchar size
        varchar color
        varchar color_code
        decimal price_override
    }

    inventory {
        bigint id PK
        bigint variant_id UK,FK
        integer stock_quantity
        integer reserved_quantity
        integer low_stock_threshold
    }

    carts {
        bigint id PK
        bigint user_id UK,FK
        timestamp updated_at
    }

    cart_items {
        bigint id PK
        bigint cart_id FK
        bigint variant_id FK
        integer quantity
    }

    wishlists {
        bigint id PK
        bigint user_id UK,FK
    }

    wishlist_items {
        bigint id PK
        bigint wishlist_id FK
        bigint product_id FK
    }

    coupons {
        bigint id PK
        varchar code UK
        varchar description
        varchar discount_type
        decimal discount_value
        decimal min_order_amount
        decimal max_discount_amount
        timestamp valid_until
        integer usage_limit
        integer used_count
        boolean is_active
    }

    orders {
        bigint id PK
        varchar order_number UK
        bigint user_id FK
        varchar status
        decimal subtotal
        decimal discount_amount
        decimal shipping_fee
        decimal tax_amount
        decimal total_amount
        text shipping_address_snapshot
        varchar coupon_code
        varchar cancellation_reason
        timestamp created_at
    }

    order_items {
        bigint id PK
        bigint order_id FK
        bigint variant_id FK
        varchar product_title
        varchar brand_name
        varchar product_image
        varchar size
        varchar color
        decimal unit_price
        integer quantity
        decimal total_price
    }

    payments {
        bigint id PK
        bigint order_id FK
        varchar transaction_id UK
        varchar payment_method
        varchar payment_status
        decimal amount
        varchar currency
        varchar razorpay_order_id UK
        varchar razorpay_payment_id UK
        boolean payment_signature_verified
        varchar idempotency_key UK
        text payment_details_json
        varchar failure_reason
        timestamp created_at
        timestamp updated_at
    }

    payment_webhook_events {
        bigint id PK
        varchar event_id UK
        varchar event_type
        timestamp processed_at
    }

    reviews {
        bigint id PK
        bigint product_id FK
        bigint user_id FK
        integer rating
        varchar title
        text comment
        boolean is_verified_buyer
    }

    audit_logs {
        bigint id PK
        bigint user_id
        varchar user_email
        varchar action_type
        varchar entity_name
        varchar entity_id
        text details
        varchar ip_address
        timestamp created_at
    }

    idempotency_records {
        bigint id PK
        varchar idempotency_key UK
        varchar request_hash
        text response_body
        integer status_code
        timestamp created_at
        timestamp expires_at
    }
```

---

## 2. Table Indexing & Constraints (`V1__init_schema.sql` & `V3__razorpay_payments.sql`)

1. **`products`**:
   - `idx_products_category` (`category_id`)
   - `idx_products_brand` (`brand_id`)
   - `idx_products_gender` (`gender`)
   - `idx_products_price` (`base_price`)
   - `idx_products_rating` (`rating`)
2. **`product_variants` & `inventory`**:
   - `UNIQUE (sku)` on `product_variants`
   - `UNIQUE (variant_id)` on `inventory`
3. **`orders`**:
   - `UNIQUE (order_number)`
   - `idx_orders_user` (`user_id`)
   - `idx_orders_status` (`status`)
4. **`payments` & `payment_webhook_events`**:
   - `idx_payments_order` (`order_id`)
   - `UNIQUE (transaction_id)`, `UNIQUE (razorpay_order_id)`, `UNIQUE (razorpay_payment_id)`, `UNIQUE (idempotency_key)`
   - `UNIQUE (event_id)` on `payment_webhook_events`
5. **`idempotency_records`**:
   - `UNIQUE (idempotency_key)` (`idempotency_records`)
6. **`audit_logs`**:
   - `idx_audit_created` (`created_at`)
