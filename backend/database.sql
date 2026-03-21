-- Vehicle Parking Slot Management System Database Schema (SQLite)

-- Enable Foreign Keys (though usually needs to be done on connection)
PRAGMA foreign_keys = ON;

-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for admins updated_at
CREATE TRIGGER IF NOT EXISTS update_admins_timestamp 
AFTER UPDATE ON admins
BEGIN
    UPDATE admins SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Users (vehicle owners/drivers) table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_registration TEXT UNIQUE NOT NULL,
    owner_name TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for users updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Parking slots table
CREATE TABLE IF NOT EXISTS parking_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK(slot_type IN ('Car', 'Bike', 'SUV', 'Truck', 'Handicapped')) DEFAULT 'Car',
    status TEXT CHECK(status IN ('Free', 'Occupied', 'Reserved', 'Maintenance')) DEFAULT 'Free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for parking_slots updated_at
CREATE TRIGGER IF NOT EXISTS update_parking_slots_timestamp 
AFTER UPDATE ON parking_slots
BEGIN
    UPDATE parking_slots SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Vehicle parking records table
CREATE TABLE IF NOT EXISTS parking_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_registration TEXT NOT NULL,
    slot_id INTEGER NOT NULL,
    owner_name TEXT,
    contact_number TEXT,
    vehicle_type TEXT CHECK(vehicle_type IN ('Car', 'Bike', 'SUV', 'Truck', 'Other')) DEFAULT 'Car',
    entry_time DATETIME NOT NULL,
    exit_time DATETIME,
    parking_duration_minutes INTEGER DEFAULT 0,
    fee_amount REAL DEFAULT 0.00,
    payment_status TEXT CHECK(payment_status IN ('Pending', 'Paid', 'Free')) DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE RESTRICT
);

-- Trigger for parking_records updated_at
CREATE TRIGGER IF NOT EXISTS update_parking_records_timestamp 
AFTER UPDATE ON parking_records
BEGIN
    UPDATE parking_records SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for system_settings updated_at
CREATE TRIGGER IF NOT EXISTS update_system_settings_timestamp 
AFTER UPDATE ON system_settings
BEGIN
    UPDATE system_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Insert default admin (username: admin, password: admin123)
INSERT OR IGNORE INTO admins (username, password_hash, full_name, email) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye7Z7lW6L7HjJ7qJ7J7J7J7J7J7J7J7', 'System Administrator', 'admin@parking.com');

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('hourly_rate', '50', 'Parking fee per hour in local currency'),
('parking_capacity', '50', 'Total number of parking slots'),
('system_name', 'Vehicle Parking Management System', 'Name of the parking system'),
('currency', 'INR', 'Currency used for parking fees');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parking_records_vehicle ON parking_records(vehicle_registration);
CREATE INDEX IF NOT EXISTS idx_parking_records_slot ON parking_records(slot_id);
CREATE INDEX IF NOT EXISTS idx_parking_records_entry_time ON parking_records(entry_time);
CREATE INDEX IF NOT EXISTS idx_parking_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_parking_slots_number ON parking_slots(slot_number);
