# HMS (Hostel Mess Management System)

HMS (Hostel Mess Management System) provides a centralized platform to manage hostel mess operations — including student registration, meal scheduling, payment tracking, and billing. It features role-based access for admins and students, with a responsive UI and a secure REST API backend.

## Tech Stack

**Frontend**
- **Framework:** React 18 (Create React App)
- **Routing:** React Router DOM v6
- **HTTP Client:** Axios
- **Animations:** Framer Motion, React Spring, Lottie React
- **Charts:** Recharts
- **Notifications:** React Hot Toast
- **Icons:** React Icons
- **Utilities:** `qrcode.react` for QR code generation, `date-fns` for date formatting

**Backend**
- **Framework:** Spring Boot 3.2 (Java 21)
- **Security:** Spring Security with JWT authentication (jjwt 0.11.5)
- **Database ORM:** Spring Data JPA / Hibernate
- **Build Tool:** Maven

**Database**
- **PostgreSQL via Supabase** (each developer runs their own Supabase project)
- Connection via Supabase connection pooler on port 6543

## Basic Workflow

1. **Authentication:** Admins and students log in via the `/login` page. The backend verifies credentials against Supabase and returns a token stored in the browser.
2. **Role-based Routing:** After login, admins are redirected to `/admin/dashboard` and students to `/student/dashboard`.
3. **Admin Operations:** Admins can add/delete students, view meal schedules, and verify student payments.
4. **Student View:** Students log in using their full name and admission number. They can view their meal schedule for the rest of the current month, skip future meals, and track payments.
5. **Payments:** Billing is calculated from the current date to the end of the month at ₹60 per meal (2 meals/day). Skipping a meal reduces the bill. Payments are made via UPI and verified by the admin.

## Prerequisites

- **Node.js** 16+ and npm
- **Java 21** and Maven 3.8+
- A **Supabase** account — each developer needs their own project (free tier works)

## Setup

### 1. Create your Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project
2. Once the project is ready, go to **SQL Editor → New query**
3. Paste the contents of `database/supabase-init.sql` and click **Run**

This creates all required tables (`admins`, `students`, `meals`, `student_meals`, `monthly_bills`, `payments`) and seeds the default admin account.

### 2. Get your connection details

In your Supabase dashboard go to **Connect → Connection pooling** and note down:
- **Host** — looks like `aws-1-us-east-1.pooler.supabase.com`
- **Port** — `6543`
- **User** — looks like `postgres.<your-project-ref>`
- **Password** — your database password

> Use the **connection pooler** details, not the direct connection. Port 5432 is blocked on most networks.

### 3. Configure the backend

Copy the example config and fill in your Supabase details:

```cmd
cd backend/src/main/resources
copy application-local.yml.example application-local.yml
```

Edit `application-local.yml` and replace the placeholder values:

```yaml
datasource:
  url: jdbc:postgresql://<pooler-host>:6543/postgres?sslmode=require
  username: postgres.<your-project-ref>
  password: <your-database-password>
```

### 4. Configure the frontend

The frontend is pre-configured to proxy API calls to `localhost:8080`. No changes needed for local development. If you want to point it at a different backend, edit `frontend/.env`:

```
REACT_APP_API_URL=http://localhost:8080/api
```

## Running Locally

You need **two terminals** running at the same time — always start the backend first.

**Terminal 1 — Backend:**
```cmd
cd backend
mvn spring-boot:run
```
Wait until you see `Started HmsApplication` in the logs. The backend runs on `http://localhost:8080`.

**Terminal 2 — Frontend:**
```cmd
cd frontend
npm install
npm start
```
The frontend runs on `http://localhost:3000` and automatically proxies all `/api/*` requests to the backend.

## Default Login Credentials

**Admin**
| Field | Value |
|---|---|
| Username | `admin` |
| Password | `1234567890` |

**Student**

Students log in using the name and admission number added by the admin. There are no default student accounts — the admin must add them first.

## Available Scripts

### Frontend (`frontend/`)

| Script | Description |
|---|---|
| `npm start` | Starts the development server |
| `npm run build` | Builds for production into the `build/` folder |
| `npm test` | Runs the test suite |

### Backend (`backend/`)

| Command | Description |
|---|---|
| `mvn spring-boot:run` | Starts the Spring Boot server |
| `mvn clean package` | Builds a production JAR into `target/` |
| `java -jar target/hostel-mess-management-1.0.0.jar` | Runs the production JAR |
