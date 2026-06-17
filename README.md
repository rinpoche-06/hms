# HMS (Hostel Mess Management System)

HMS (Hostel Mess Management System) provides a centralized platform to manage hostel mess operations — including student registration, meal scheduling, payment tracking, and billing. It features role-based access for admins and students, with a responsive UI and a secure REST API backend.

## Tech Stack

**Frontend**
- **Framework:** React 18 (Create React App)
- **Animations:** Framer Motion, React Spring, Lottie React

**Backend**
- **Framework:** Spring Boot 3.2 (Java 21)
- **Security:** Spring Security with JWT authentication (jjwt 0.11.5)
- **Database ORM:** Spring Data JPA / Hibernate
- **Validation:** Spring Boot Starter Validation
- **Build Tool:** Maven

**Database**
- **Production:** PostgreSQL via Supabase
- **Local Development:** H2 in-memory database

## Basic Workflow

1. **Authentication:** Admins and students log in via the `/login` page. JWT tokens are issued and stored for session management.
2. **Role-based Routing:** After login, admins are redirected to `/admin/dashboard` and students to `/student/dashboard`.
3. **Admin Operations:** Admins can add/manage students, configure meal schedules, view payment summaries, and track monthly bills.
4. **Student View:** Students can view their meal schedule, check their payment status, and see their billing history.
5. **Payments:** Billing is calculated based on meal costs with a late fine if it may arise. 
## Environment Variables

This project requires configuration for both the frontend and backend.

### Frontend

Create a `.env` file inside the `frontend/` directory. A `.env.example` is included for reference.

```
REACT_APP_API_URL=http://localhost:8080/api
```

For production, set this to your deployed backend URL:
```
REACT_APP_API_URL=https://your-backend.railway.app/api
```

### Backend

Create a `.env` file inside the `backend/` directory. A `.env.example` is included for reference.

```
# Supabase Database Configuration
SUPABASE_DB_URL=jdbc:postgresql://<your-supabase-host>:5432/postgres
SUPABASE_DB_USER=your_db_user
SUPABASE_DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=86400000

# UPI Configuration
UPI_ID=your_upi_id
```

## Getting Started

### Prerequisites

- **Node.js** 16+ and npm
- **Java 21** and Maven 3.8+
- A **Supabase** project with PostgreSQL (or use H2 for local dev)

### Database Setup

The SQL schema for production is located at `database/supabase-init.sql`. Run this against your Supabase PostgreSQL instance to initialize the tables.

### Backend

```bash
cd backend

# Set up your .env file
cp .env.example .env
# Edit .env with your credentials

# Run with local profile (uses H2 in-memory DB)
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# Or run with production profile (uses Supabase PostgreSQL)
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

The backend will start on `http://localhost:8080`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up your .env file
cp .env.example .env
# Edit .env with your API URL

# Start the development server
npm start
```

The frontend will start on `http://localhost:3000` and proxy API requests to port 8080.

## Available Scripts

### Frontend (`frontend/`)

| Script | Description |
|---|---|
| `npm start` | Starts the development server with Hot Module Replacement |
| `npm run build` | Builds the application for production into the `build/` folder |
| `npm test` | Runs the test suite |
| `npm run eject` | Ejects from Create React App (irreversible) |

### Backend (`backend/`)

| Command | Description |
|---|---|
| `./mvn spring-boot:run` | Starts the Spring Boot development server |
| `./mvn clean package` | Builds a production JAR into `target/` |
| `./mvn test` | Runs the test suite |
| `java -jar target/hostel-mess-management-1.0.0.jar` | Runs the production JAR |
