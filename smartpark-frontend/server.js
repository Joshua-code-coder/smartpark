const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(express.json());

// ============================
// CORS CONFIG (IMPORTANT)
// ============================
app.use(cors({
    origin: "https://smartpark-main.vercel.app", // 👈 replace with your real Vercel URL
    credentials: true
}));

// ============================
// DATABASE CONNECTION (AIVEN)
// ============================
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

// Test DB connection
(async () => {
    try {
        await pool.query("SELECT 1");
        console.log("✅ DB CONNECTED");
    } catch (err) {
        console.error("❌ DB CONNECTION FAILED:", err.message);
    }
})();

// ============================
// REGISTER
// ============================
app.post('/api/register', async (req, res) => {
    const { name, email, password, vehicles } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields"
        });
    }

    try {
        console.log("Registration attempt:", email);
        console.log("REQ BODY:", req.body);

        const [userRes] = await pool.execute(
            'INSERT INTO Users (name, email, password) VALUES (?, ?, ?)',
            [name, email, password]
        );

        const userId = userRes.insertId;

        // Insert vehicles if any
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

        res.json({
            success: true,
            userId,
            name
        });

    } catch (err) {
        console.error("🔥 FULL ERROR:", err);
        console.error("SQL MESSAGE:", err.message);
        console.error("SQL CODE:", err.code);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ============================
// LOGIN
// ============================
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
            res.json({ success: false, message: "Invalid credentials" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ============================
// VEHICLES
// ============================
app.get('/api/vehicles/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT vehicle_id as id, license_plate FROM Vehicles WHERE user_id = ?',
            [req.params.userId]
        );

        res.json({ success: true, vehicles: rows });

    } catch (err) {
        res.status(500).json({ success: false });
    }
});

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

// ============================
// SLOTS
// ============================
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
        res.status(500).json({ success: false });
    }
});

// ============================
// BOOKING
// ============================
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

// ============================
// HISTORY
// ============================
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

// ============================
// EXTEND BOOKING
// ============================
app.post('/api/extend-booking', async (req, res) => {
    const { bookingId, additionalHours, userId } = req.body;

    try {
        // Handle Demo Extensions (if ID is from our frontend demo or DB query would fail)
        if (Number(bookingId) >= 1) {
            const costPerHr = 5; // Default for demo
            return res.json({
                success: true,
                originalCost: 10.00,
                additionalCost: additionalHours * costPerHr,
                newTotalCost: 10.00 + (additionalHours * costPerHr)
            });
        }

        // 1. Get current booking and hourly rate
        const [bookingRows] = await pool.execute(`
            SELECT b.end_time, z.hourly_rate 
            FROM Bookings b
            JOIN ParkingSlots ps ON b.slot_id = ps.slot_id
            JOIN Zones z ON ps.zone_id = z.zone_id
            WHERE b.booking_id = ? AND b.user_id = ?
        `, [bookingId, userId]);

        if (bookingRows.length === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        const { end_time, hourly_rate } = bookingRows[0];
        const additionalCost = additionalHours * hourly_rate;
        const newEndTime = new Date(new Date(end_time).getTime() + additionalHours * 3600000);

        // 2. Update booking end time
        await pool.execute('UPDATE Bookings SET end_time = ? WHERE booking_id = ?', [newEndTime, bookingId]);

        // 3. Add additional payment
        await pool.execute('INSERT INTO Payments (booking_id, amount, payment_status) VALUES (?, ?, "paid")', [bookingId, additionalCost]);

        res.json({
            success: true,
            additionalCost,
            newEndTime
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================
// START SERVER (RENDER SAFE)
// ============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});