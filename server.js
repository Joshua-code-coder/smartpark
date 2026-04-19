const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
// This uses SSL and the correct port for your Aiven Cloud instance.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 20534,
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 30000 
});

// ==========================================
// USER ROUTES
// ==========================================

// 2. REGISTER
app.post('/api/register', async (req, res) => {
    const { name, email, password, vehicles } = req.body;
    
    if (!name || !email || !password) {
        return res.json({ success: false, message: 'Name, email, and password are required' });
    }
    
    try {
        const [userRes] = await pool.execute('INSERT INTO Users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
        const userId = userRes.insertId;
        
        if (vehicles && Array.isArray(vehicles)) {
            for (let plate of vehicles) {
                if (plate && plate.trim() !== '') {
                    await pool.execute('INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)', [userId, plate.trim()]);
                }
            }
        }
        res.json({ success: true, userId, name });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Email already registered' });
        } else {
            res.status(500).json({ success: false, message: 'Registration failed. Please check backend logs.' });
        }
    }
});

// 3. LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT user_id, name FROM Users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.json({ success: false, message: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 4. VEHICLE ROUTES
app.get('/api/vehicles/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT vehicle_id as id, license_plate as plate FROM Vehicles WHERE user_id = ?', [req.params.userId]);
        res.json({ success: true, vehicles: rows });
    } catch (err) {
        res.json({ success: false, message: 'Server error' });
    }
});

app.post('/api/vehicles', async (req, res) => {
    const { userId, licensePlate } = req.body;
    try {
        const [result] = await pool.execute('INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)', [userId, licensePlate.trim()]);
        res.json({ success: true, vehicleId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add vehicle' });
    }
});

app.delete('/api/vehicles/:vehicleId', async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM Vehicles WHERE vehicle_id = ?', [req.params.vehicleId]);
        res.json({ success: result.affectedRows > 0 });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
});

// 5. BOOKING ROUTES
app.get('/api/slots', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT ps.slot_id as id, ps.slot_number, l.name as location, ps.is_available 
            FROM ParkingSlots ps 
            JOIN Locations l ON ps.location_id = l.location_id 
        `);
        res.json({ success: true, slots: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/book', async (req, res) => {
    const { userId, vehicleId, slotId, durationMins, amount } = req.body;
    try {
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationMins * 60000);
        
        const [bookRes] = await pool.execute(
            'INSERT INTO Bookings (user_id, vehicle_id, slot_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, "active")',
            [userId, vehicleId, slotId, startTime, endTime]
        );
        
        await pool.execute('INSERT INTO Payments (booking_id, amount, payment_status) VALUES (?, ?, "paid")', [bookRes.insertId, amount]);
        await pool.execute('UPDATE ParkingSlots SET is_available = FALSE WHERE slot_id = ?', [slotId]);
        
        res.json({ success: true, bookingId: bookRes.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// 6. HISTORY & ADMIN
app.get('/api/history/:userId', async (req, res) => {
    try {
        const [history] = await pool.execute(`
            SELECT v.license_plate, p.amount, b.start_time, l.name as location 
            FROM Bookings b
            JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
            JOIN Payments p ON b.booking_id = p.booking_id
            JOIN ParkingSlots ps ON b.slot_id = ps.slot_id
            JOIN Locations l ON ps.location_id = l.location_id
            WHERE b.user_id = ?`, [req.params.userId]);
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load history' });
    }
});

app.get('/api/admin/dashboard', async (req, res) => {
    try {
        const [revRows] = await pool.execute('SELECT SUM(amount) as total FROM Payments');
        const [userRows] = await pool.execute('SELECT COUNT(*) as total FROM Users');
        res.json({ success: true, stats: { totalRevenue: revRows[0].total || 0, totalUsers: userRows[0].total } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load admin data' });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log('✅ SmartPark Backend running');
});