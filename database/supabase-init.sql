-- Hostel Mess Management System - Supabase PostgreSQL Schema

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS monthly_bills CASCADE;
DROP TABLE IF EXISTS student_meals CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Admin table
CREATE TABLE admins (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    admission_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(15),
    room_number VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meals table
CREATE TABLE meals (
    id BIGSERIAL PRIMARY KEY,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'dinner')),
    meal_date DATE NOT NULL,
    cost DECIMAL(10,2) DEFAULT 60.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (meal_type, meal_date)
);

-- Student meal preferences
CREATE TABLE student_meals (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    meal_id BIGINT NOT NULL,
    is_opted BOOLEAN DEFAULT TRUE,
    skipped_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    UNIQUE (student_id, meal_id)
);

-- Monthly bills
CREATE TABLE monthly_bills (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_meals INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date TIMESTAMP NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE (student_id, month, year)
);

-- Payment transactions
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    bill_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    transaction_id VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES monthly_bills(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_student_meals_date ON student_meals(created_at);
CREATE INDEX idx_meals_date ON meals(meal_date);
CREATE INDEX idx_bills_due_date ON monthly_bills(due_date);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_students_admission ON students(admission_number);
CREATE INDEX idx_admins_username ON admins(username);

-- Insert default admin (password: admin123)
INSERT INTO admins (username, password, name, email) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Admin', 'admin@hms.com');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for student_meals
CREATE TRIGGER update_student_meals_updated_at BEFORE UPDATE ON student_meals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for monthly_bills
CREATE TRIGGER update_monthly_bills_updated_at BEFORE UPDATE ON monthly_bills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your Supabase setup)
-- These are typically handled by Supabase, but included for completeness
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
