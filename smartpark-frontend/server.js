const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// ✅ CORS (replace with your Vercel URL)
app.use(cors({
    origin: "https://smartpark-main.vercel.app"
}));

app.use(express.json());

// ==========================================
// ✅ DATABASE CONNECTION (AIVEN FIXED)
// ==========================================
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

// ✅ TEST DB CONNECTION
(async () => {
    try {
        await pool.query("SELECT 1");
        console.log("✅ DB CONNECTED");
    } catch (err) {
        console.error("❌ DB FAILED", err);
    }
})();

// ==========================================
// USER ROUTES
// ==========================================

// REGISTER
app.post('/api/register', async (req, res) => {
    const { name, email, password, vehicles } = req.body;

    if (!name || !email || !password) {
        return res.json({ success: false, message: 'Name, email, password required' });
    }

    try {
        console.log('Registration attempt:', email);

        const [userRes] = await pool.execute(
            'INSERT INTO Users (name, email, password) VALUES (?, ?, ?)',
            [name, email, password]
        );

        const userId = userRes.insertId;

        if (vehicles && Array.isArray(vehicles)) {
            for (let plate of vehicles) {
                if (plate && plate.trim() !== '') {
                    await pool.execute(
                        'INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)',
                        [userId, plate.trim()]
                    );
                }
            }
        }

        res.json({ success: true, userId, name });

    } catch (err) {
        console.error('Registration error:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Email already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Registration failed' });
        }
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.execute(
            'SELECT user_id, name FROM Users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// GET VEHICLES
app.get('/api/vehicles/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT vehicle_id as id, license_plate FROM Vehicles WHERE user_id = ?',
            [req.params.userId]
        );

        res.json({ success: true, vehicles: rows });

    } catch (err) {
        res.json({ success: false });
    }
});

// ADD VEHICLE
app.post('/api/vehicles', async (req, res) => {
    const { userId, licensePlate } = req.body;

    try {
        const [result] = await pool.execute(
            'INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)',
            [userId, licensePlate]
        );

        res.json({ success: true, vehicleId: result.insertId });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// DELETE VEHICLE
app.delete('/api/vehicles/:vehicleId', async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM Vehicles WHERE vehicle_id = ?',
            [req.params.vehicleId]
        );

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// BOOKINGS
// ==========================================

// GET SLOTS
app.get('/api/slots', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT ps.slot_id as id, ps.slot_number, l.name as location
            FROM ParkingSlots ps
            JOIN Locations l ON ps.location_id = l.location_id
            WHERE ps.is_available = TRUE
        `);

        res.json({ success: true, slots: rows });

    } catch (err) {
        res.json({ success: false });
    }
});

// BOOK SLOT
app.post('/api/book', async (req, res) => {
    const { userId, vehicleId, slotId, durationMins, amount } = req.body;

    try {
        const start = new Date();
        const end = new Date(start.getTime() + durationMins * 60000);

        const [bookRes] = await pool.execute(
            'INSERT INTO Bookings (user_id, vehicle_id, slot_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, "active")',
            [userId, vehicleId, slotId, start, end]
        );

        await pool.execute(
            'INSERT INTO Payments (booking_id, amount, payment_status) VALUES (?, ?, "paid")',
            [bookRes.insertId, amount]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// HISTORY
app.get('/api/history/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT v.license_plate, p.amount, b.start_time, b.end_time, l.name, ps.slot_number
            FROM Bookings b
            JOIN Vehicles v ON b.vehicle_id = v.vehicle_id
            JOIN Payments p ON b.booking_id = p.booking_id
            JOIN ParkingSlots ps ON b.slot_id = ps.slot_id
            JOIN Locations l ON ps.location_id = l.location_id
            WHERE b.user_id = ?
        `, [req.params.userId]);

        res.json({ success: true, history: rows });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// SERVER START
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});