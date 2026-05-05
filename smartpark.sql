-- ==========================================
-- SMARTPARK V3.0 - THE ULTIMATE SCHEMA
-- ==========================================

-- 1. CLEAN SLATE
DROP DATABASE IF EXISTS smartpark_v3;
CREATE DATABASE smartpark_v3;
USE smartpark_v3;

-- ==========================================
-- 2. TABLE CREATION
-- ==========================================

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    license_plate VARCHAR(20) NOT NULL,
    -- "ON DELETE CASCADE" means if a user deletes their account, their cars are removed too
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE Zones (
    zone_id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name CHAR(1) NOT NULL UNIQUE,
    hourly_rate DECIMAL(5,2) NOT NULL
);

CREATE TABLE ParkingSlots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT,
    zone_id INT,
    slot_number VARCHAR(10) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (location_id) REFERENCES Locations(location_id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES Zones(zone_id) ON DELETE CASCADE
);

CREATE TABLE Bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    vehicle_id INT,
    slot_id INT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES ParkingSlots(slot_id) ON DELETE CASCADE
);

CREATE TABLE Payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('paid', 'pending', 'failed') DEFAULT 'paid',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE
);

-- ==========================================
-- 3. SEED DATA (Base Parking Lots)
-- ==========================================

INSERT INTO Locations (name) VALUES ('SmartPark');

INSERT INTO Zones (zone_name, hourly_rate) VALUES 
('A', 5.00),  -- Premium zone - highest price
('B', 3.50),  -- Mid-high zone
('C', 2.50),  -- Mid-low zone  
('D', 2.00);  -- Economy zone - lowest price

INSERT INTO ParkingSlots (location_id, zone_id, slot_number) VALUES 
-- Zone A slots (Premium)
(1, 1, 'A-01'), (1, 1, 'A-02'), (1, 1, 'A-03'), (1, 1, 'A-04'),
-- Zone B slots (Mid-High)
(1, 2, 'B-01'), (1, 2, 'B-02'), (1, 2, 'B-03'), (1, 2, 'B-04'),
-- Zone C slots (Mid-Low)
(1, 3, 'C-01'), (1, 3, 'C-02'), (1, 3, 'C-03'), (1, 3, 'C-04'),
-- Zone D slots (Economy)
(1, 4, 'D-01'), (1, 4, 'D-02'), (1, 4, 'D-03'), (1, 4, 'D-04');

-- ==========================================
-- 4. AUTOMATION TRIGGERS (For the Admin Dashboard)
-- ==========================================
-- These triggers automatically lock and unlock parking slots 
-- the exact second a booking is made or completed.

DELIMITER //

CREATE TRIGGER after_booking_insert 
AFTER INSERT ON Bookings 
FOR EACH ROW
BEGIN 
    IF NEW.status = 'active' THEN
        UPDATE ParkingSlots SET is_available = FALSE WHERE slot_id = NEW.slot_id; 
    END IF;
END//

CREATE TRIGGER after_booking_update 
AFTER UPDATE ON Bookings 
FOR EACH ROW
BEGIN 
    IF NEW.status IN ('completed', 'cancelled') THEN 
        UPDATE ParkingSlots SET is_available = TRUE WHERE slot_id = NEW.slot_id; 
    END IF; 
END//

DELIMITER ;