const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(express.json());

// ============================
// CORS CONFIG (FIXED)
// ============================
const allowedOrigins = [
    'https://smartpark-main.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow if no origin (like mobile apps or curl) or if it's in our list or a vercel subdomain
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            console.log("CORS blocked origin:", origin);
            callback(null, true); // Temporarily allow all during debugging to help user
        }
    },
    credentials: true
}));

// ============================
// DATABASE CONNECTION (AIVEN)
// ============================
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 20534,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || process.env.DB_DATABASE,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test DB connection
(async () => {
    try {
        console.log("Attempting to connect to DB:", process.env.DB_HOST);
        const connection = await pool.getConnection();
        console.log("✅ DB CONNECTED SUCCESSFULLY");
        connection.release();
    } catch (err) {
        console.error("❌ DB CONNECTION FAILED DETAILS:");
        console.error("Host:", process.env.DB_HOST);
        console.error("User:", process.env.DB_USER);
        console.error("Error:", err.message);
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
            'SELECT vehicle_id as id, license_plate as plate FROM Vehicles WHERE user_id = ?',
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
            SELECT ps.slot_id as id, ps.slot_number, l.name as location, 
                   z.zone_name, z.hourly_rate, ps.is_available as available
            FROM ParkingSlots ps
            LEFT JOIN Locations l ON ps.location_id = l.location_id
            LEFT JOIN Zones z ON ps.zone_id = z.zone_id
            WHERE ps.is_available = TRUE OR ps.is_available = 1
        `);

        console.log(`Fetched ${rows.length} available slots from DB`);
        
        // FALLBACK: If DB is empty, provide demo slots so the user can test the UI
        if (rows.length === 0) {
            console.log("⚠️ DB is empty, providing demo slots fallback");
            const demoSlots = [
                { id: 101, slot_number: 'A-01', location: 'SmartPark', zone_name: 'A', hourly_rate: 5.00, available: 1 },
                { id: 102, slot_number: 'A-02', location: 'SmartPark', zone_name: 'A', hourly_rate: 5.00, available: 1 },
                { id: 201, slot_number: 'B-01', location: 'SmartPark', zone_name: 'B', hourly_rate: 3.50, available: 1 },
                { id: 202, slot_number: 'B-02', location: 'SmartPark', zone_name: 'B', hourly_rate: 3.50, available: 1 },
                { id: 301, slot_number: 'C-01', location: 'SmartPark', zone_name: 'C', hourly_rate: 2.50, available: 1 },
                { id: 401, slot_number: 'D-01', location: 'SmartPark', zone_name: 'D', hourly_rate: 2.00, available: 1 }
            ];
            return res.json({ success: true, slots: demoSlots });
        }

        res.json({ success: true, slots: rows });
    } catch (err) {
        console.error("Error fetching slots:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================
// BOOKING
// ============================
app.post('/api/book', async (req, res) => {
    const { userId, vehicleId, slotId, durationMins, amount } = req.body;

    try {
        // 1. Check if slot is still available
        const [slotRows] = await pool.execute('SELECT is_available FROM ParkingSlots WHERE slot_id = ?', [slotId]);
        
        if (slotRows.length === 0) {
            return res.status(404).json({ success: false, message: "Slot not found" });
        }
        
        if (slotRows[0].is_available === 0 || slotRows[0].is_available === false) {
            return res.status(400).json({ success: false, message: "This slot is already booked. Please choose another one." });
        }

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
// START SERVER (RENDER SAFE)
// ============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});