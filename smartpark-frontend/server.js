const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234', // <-- CHANGE THIS IF NEEDED
    database: 'smartpark_v3'
});

// ==========================================
// USER ROUTES
// ==========================================

// 2. REGISTER
app.post('/api/register', async (req, res) => {
    const { name, email, password, vehicles } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
        return res.json({ success: false, message: 'Name, email, and password are required' });
    }
    
    try {
        console.log('Registration attempt:', email);
        const [userRes] = await pool.execute('INSERT INTO Users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
        const userId = userRes.insertId;
        
        // Add vehicles if provided
        if (vehicles && Array.isArray(vehicles)) {
            for (let plate of vehicles) {
                if (plate && plate.trim() !== '') {
                    await pool.execute('INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)', [userId, plate.trim()]);
                }
            }
        }
        console.log('Registration successful for:', email);
        res.json({ success: true, userId, name });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Email already registered' });
        } else {
            res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
        }
    }
});

// 3. LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log('Login attempt:', email);
        const [rows] = await pool.execute('SELECT user_id, name FROM Users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length > 0) {
            console.log('Login successful for:', email);
            res.json({ success: true, user: rows[0] });
        } else {
            console.log('Login failed - invalid credentials for:', email);
            res.json({ success: false, message: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error. Check backend logs.' });
    }
});

// 4. GET USER VEHICLES
app.get('/api/vehicles/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT vehicle_id as id, license_plate as plate, license_plate FROM Vehicles WHERE user_id = ?', [req.params.userId]);
        res.json({ success: true, vehicles: rows });
    } catch (err) {
        res.json({ success: false, message: 'Server error' });
    }
});

// 4a. ADD VEHICLE
app.post('/api/vehicles', async (req, res) => {
    const { userId, licensePlate } = req.body;
    try {
        if (!userId || !licensePlate) {
            return res.status(400).json({ success: false, message: 'User ID and license plate required' });
        }
        const [result] = await pool.execute('INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)', [userId, licensePlate.trim()]);
        res.json({ success: true, vehicleId: result.insertId });
    } catch (err) {
        console.error('Error adding vehicle:', err);
        res.status(500).json({ success: false, message: 'Failed to add vehicle' });
    }
});

// 4b. DELETE VEHICLE
app.delete('/api/vehicles/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const [result] = await pool.execute('DELETE FROM Vehicles WHERE vehicle_id = ?', [vehicleId]);
        if (result.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Vehicle not found' });
        }
    } catch (err) {
        console.error('Error deleting vehicle:', err);
        res.status(500).json({ success: false, message: 'Failed to delete vehicle' });
    }
});

// ==========================================
// BOOKING & HISTORY ROUTES
// ==========================================

// 5. GET AVAILABLE SLOTS (For the booking dropdowns)
app.get('/api/slots', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT ps.slot_id as id, ps.slot_number, l.name as location, ps.is_available as available
            FROM ParkingSlots ps 
            JOIN Locations l ON ps.location_id = l.location_id 
            WHERE ps.is_available = TRUE
        `);
        res.json({ success: true, slots: rows });
    } catch (err) {
        res.json({ success: false, message: 'Server error' });
    }
});

// 6. CREATE BOOKING
app.post('/api/book', async (req, res) => {
    const { userId, vehicleId, slotId, durationMins, amount } = req.body;
    try {
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationMins * 60000);
        
        const [bookRes] = await pool.execute(
            'INSERT INTO Bookings (user_id, vehicle_id, slot_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, "active")',
            [userId, vehicleId, slotId, startTime, endTime]
        );
        
        await pool.execute(
            'INSERT INTO Payments (booking_id, amount, payment_status) VALUES (?, ?, "paid")',
            [bookRes.insertId, amount]
        );
        
        res.json({ success: true, bookingId: bookRes.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// 7. GET USER HISTORY 
app.get('/api/history/:userId', async (req, res) => {
    try {
        const [history] = await pool.execute(`
            SELECT v.license_plate, p.amount, b.start_time, b.end_time, l.name as location, ps.slot_number
            FROM Bookings b
            JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
            JOIN Payments p ON b.booking_id = p.booking_id
            JOIN ParkingSlots ps ON b.slot_id = ps.slot_id
            JOIN Locations l ON ps.location_id = l.location_id
            WHERE b.user_id = ?
            ORDER BY b.start_time DESC
        `, [req.params.userId]);
        res.json({ success: true, history });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================

// 8. GET ALL ADMIN DATA (Stats, Live Slots, User List)
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        // Get Total Revenue
        const [revRows] = await pool.execute('SELECT SUM(amount) as total FROM Payments WHERE payment_status = "paid"');
        
        // Get Active Parkers
        const [activeRows] = await pool.execute('SELECT COUNT(*) as active FROM Bookings WHERE status = "active"');
        
        // Get All Users with their vehicles
        const [userRows] = await pool.execute(`
            SELECT u.user_id, u.name, u.email, GROUP_CONCAT(v.license_plate) as plates
            FROM Users u
            LEFT JOIN Vehicles v ON u.user_id = v.user_id
            GROUP BY u.user_id
        `);

        // Get Live Slot Status
        const [slotRows] = await pool.execute(`
            SELECT ps.slot_number, l.name as location, ps.is_available 
            FROM ParkingSlots ps 
            JOIN Locations l ON ps.location_id = l.location_id
        `);

        res.json({
            success: true,
            stats: {
                totalRevenue: revRows[0].total || 0,
                activeParkers: activeRows[0].active || 0,
                totalUsers: userRows.length
            },
            users: userRows,
            slots: slotRows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load admin data' });
    }
});

// DEBUG: Test endpoint to list all users
app.get('/api/test/users', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT user_id, name, email FROM Users');
        res.json({ success: true, users: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// START SERVER
app.listen(3000, () => {
    console.log('✅ SmartPark Backend running on http://localhost:3000');
});