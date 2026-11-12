# VOGNIX – Database Setup & Migration Guide

This guide explains how to run VOGNIX using the **Default Zero-Setup H2 Database** (local development/evaluation), **PostgreSQL / Neon Postgres** (recommended for Vercel production persistence), or a **Dedicated MySQL 8.0 Instance**.

---

## 0. Production Cloud Persistence: Vercel + Neon PostgreSQL

Serverless containers on Vercel have ephemeral `/tmp` filesystems and can scale across multiple containers. To persist customer accounts, carts, wishlists, orders, payments, inventory, and admin catalog changes across restarts and deployments:

1. Provision a **Neon Postgres** database on the Vercel Marketplace (e.g. via Vercel Dashboard Storage or `vercel install neon --name vognix-db`).
2. Vercel injects `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, and `POSTGRES_URL_NON_POOLING` into the project environment.
3. On startup, [`DatabaseEnvironmentPostProcessor`](backend/src/main/java/com/vognix/config/DatabaseEnvironmentPostProcessor.java) automatically detects `DATABASE_URL` / `POSTGRES_URL`, configures `PostgreSQLDialect` + HikariCP, points Flyway at `classpath:db/postgres` (using `DATABASE_URL_UNPOOLED` for advisory locks when available), and creates/seeds all 22 tables automatically.
4. For manual local PostgreSQL runs:
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```

---

## 1. Option A: Zero-Setup Persistent H2 (Default - Recommended for Evaluation)

VOGNIX comes preconfigured with a file-backed persistent H2 database operating in strict **MySQL compatibility mode**.

### How It Works:
- **No MySQL Server required** on your machine.
- File storage path: `./data/vognixdb.mv.db` (created automatically in the backend directory).
- Table schemas and seed data are applied via Flyway (`V1__init_schema.sql`, `V2__seed_data.sql`, and `V3__razorpay_payments.sql`).
- All MySQL data types, indexes, and constraints (`BIGINT AUTO_INCREMENT`, `DECIMAL(10,2)`, `UNIQUE`, `FOREIGN KEY`) are supported identically.

### Running with Default Profile:
```bash
cd backend
mvn spring-boot:run
```
*Or using the compiled fat jar:*
```bash
java -jar target/vognix-backend-1.0.0.jar
```

---

## 2. Option B: Running with MySQL 8.0 Server

To connect to a native MySQL 8 server (e.g. running locally or in Docker):

### Step 1: Create Database in MySQL
Log into MySQL CLI or Workbench and run:
```sql
CREATE DATABASE IF NOT EXISTS vognix_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Configure Credentials in `application-mysql.properties`
Open `backend/src/main/resources/application-mysql.properties` or set environment variables (`MYSQL_URL`, `MYSQL_USER`, `MYSQL_PASSWORD`):
```properties
spring.datasource.url=${MYSQL_URL:jdbc:mysql://localhost:3306/vognix_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC}
spring.datasource.username=${MYSQL_USER:root}
spring.datasource.password=${MYSQL_PASSWORD:root}
```

### Step 3: Run Backend with MySQL Profile
```bash
cd backend
java -jar target/vognix-backend-1.0.0.jar --spring.profiles.active=mysql
```
*Or with Maven:*
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

Flyway will automatically execute migrations against `vognix_db`, creating all 22 tables and seeding initial catalog data.

---

## 3. Option C: Running MySQL 8 via Docker

If you have Docker installed, you can spin up a MySQL 8 container in one command:
```bash
docker run --name vognix-mysql -e MYSQL_ROOT_PASSWORD=rootpassword -e MYSQL_DATABASE=vognix_db -p 3306:3306 -d mysql:8.0
```
Then launch the backend with `--spring.profiles.active=mysql`.

---

## 4. Resetting the Database

To clean and re-seed the database:

### For H2 File Database:
Stop the backend process and delete the `./backend/data` directory:
```bash
# On Windows PowerShell
Remove-Item -Recurse -Force backend\data
```
Restarting the backend will re-run `V1__init_schema.sql`, `V2__seed_data.sql`, and `V3__razorpay_payments.sql` cleanly.

### For MySQL:
```sql
DROP DATABASE vognix_db;
CREATE DATABASE vognix_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Restart the backend to automatically recreate and re-seed all tables.
