const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  'https://smartpark-main-oek2d9rbz-janny18s-projects.vercel.app',
  'http://localhost:5173' // keep this for local development
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'SmartPark Backend is running'
    });
});

// 1. DATABASE CONNECTION
// This uses SSL and the correct port for your Aiven Cloud instance.
let pool;

// Try to connect to Aiven database
if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE || 'smartpark',
            port: parseInt(process.env.DB_PORT) || 20534,
            ssl: {
                rejectUnauthorized: false
            },
            connectTimeout: 30000,
            acquireTimeout: 30000,
            timeout: 30000
        });
        console.log('Database pool created with Aiven Cloud');
        
        // Test the connection
        pool.getConnection().then(conn => {
            console.log('Database connected successfully');
            conn.release();
        }).catch(err => {
            console.log('Database connection test failed:', err.message);
            pool = null;
        });
    } catch (err) {
        console.log('Database connection failed, running in mock mode:', err.message);
        pool = null;
    }
} else {
    console.log('Database environment variables not set, running in mock mode');
    pool = null;
}

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
        // Check if database is available
        if (!pool) {
            console.log('Database not available, using mock registration');
            // Mock registration - generate a random user ID
            const userId = Math.floor(Math.random() * 10000) + 1;
            return res.json({ success: true, userId, name });
        }

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
        res.json({ success: true, userId, name });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Email already registered' });
        } else {
            // Fallback to mock registration on database error
            console.log('Database error, using mock registration');
            const userId = Math.floor(Math.random() * 10000) + 1;
            res.json({ success: true, userId, name });
        }
    }
});

// 3. LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if database is available
        if (!pool) {
            console.log('Database not available, using mock login');
            // Mock login - accept any email/password for demo
            return res.json({ 
                success: true, 
                user: { 
                    user_id: Math.floor(Math.random() * 10000) + 1, 
                    name: email.split('@')[0] || 'Demo User' 
                } 
            });
        }

        const [rows] = await pool.execute('SELECT user_id, name FROM Users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.json({ success: false, message: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        // Fallback to mock login on database error
        console.log('Database error, using mock login');
        res.json({ 
            success: true, 
            user: { 
                user_id: Math.floor(Math.random() * 10000) + 1, 
                name: email.split('@')[0] || 'Demo User' 
            } 
        });
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

// Mock slot storage for fallback
const mockSlots = [
    // Zone A slots (Premium) - 5 AED/hr
    { id: 1, slot_number: 'A-01', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    { id: 2, slot_number: 'A-02', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    { id: 3, slot_number: 'A-03', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    { id: 4, slot_number: 'A-04', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    // Zone B slots (Mid-High) - 3.5 AED/hr
    { id: 5, slot_number: 'B-01', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    { id: 6, slot_number: 'B-02', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    { id: 7, slot_number: 'B-03', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    { id: 8, slot_number: 'B-04', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    // Zone C slots (Mid-Low) - 2.5 AED/hr
    { id: 9, slot_number: 'C-01', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    { id: 10, slot_number: 'C-02', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    { id: 11, slot_number: 'C-03', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    { id: 12, slot_number: 'C-04', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    // Zone D slots (Economy) - 2 AED/hr
    { id: 13, slot_number: 'D-01', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 },
    { id: 14, slot_number: 'D-02', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 },
    { id: 15, slot_number: 'D-03', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 },
    { id: 16, slot_number: 'D-04', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 }
];

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
        console.log('Database connection failed, using mock slots data');
        res.json({ success: true, slots: mockSlots });
    }
});

app.post('/api/book', async (req, res) => {
    const { userId, vehicleId, slotId, durationHours } = req.body;
    
    // Validate input
    if (!userId || !vehicleId || !slotId || !durationHours) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    try {
        // Get slot rate for pricing
        const slot = mockSlots.find(s => s.id === parseInt(slotId));
        const hourlyRate = slot ? slot.hourly_rate : 5.00;
        const amount = durationHours * hourlyRate;
        
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
        
        const [bookRes] = await pool.execute(
            'INSERT INTO Bookings (user_id, vehicle_id, slot_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, "active")',
            [userId, vehicleId, slotId, startTime, endTime]
        );
        
        await pool.execute('INSERT INTO Payments (booking_id, amount, payment_status) VALUES (?, ?, "paid")', [bookRes.insertId, amount]);
        
        res.json({ success: true, bookingId: bookRes.insertId, amount });
    } catch (err) {
        console.error('Booking error:', err);
        res.status(500).json({ success: false, message: 'Failed to create booking' });
    }
});

// Mock history data for fallback
const mockHistory = [
    {
        id: 1,
        license_plate: 'A76724',
        amount: '10.50',
        start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        location: 'SmartPark',
        slot_number: 'B-03',
        durationMins: 180
    },
    {
        id: 2,
        license_plate: 'B12345',
        amount: '15.00',
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        location: 'SmartPark',
        slot_number: 'A-02',
        durationMins: 120
    },
    {
        id: 3,
        license_plate: 'C98765',
        amount: '5.00',
        start_time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
        location: 'SmartPark',
        slot_number: 'C-01',
        durationMins: 120
    }
];

// 6. HISTORY & ADMIN
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
        
        // Add durationMins to each history item
        const historyWithDuration = history.map(item => ({
            ...item,
            durationMins: Math.round((new Date(item.end_time || item.start_time) - new Date(item.start_time)) / (1000 * 60))
        }));
        
        res.json({ success: true, history: historyWithDuration });
    } catch (err) {
        console.log('Database connection failed, using mock history data');
        res.json({ success: true, history: mockHistory });
    }
});

// 7. EXTEND BOOKING
app.post('/api/extend-booking', async (req, res) => {
    const { bookingId, additionalHours, userId } = req.body;
    
    if (!bookingId || !additionalHours || !userId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    try {
        // Get current booking
        const [bookingRows] = await pool.execute(
            'SELECT * FROM Bookings WHERE booking_id = ? AND user_id = ? AND status = "active"',
            [bookingId, userId]
        );
        
        if (bookingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found or not active' });
        }
        
        const booking = bookingRows[0];
        const slot = mockSlots.find(s => s.id === booking.slot_id);
        const hourlyRate = slot ? slot.hourly_rate : 5.00;
        
        // Calculate costs
        const additionalCost = additionalHours * hourlyRate;
        const originalCost = booking.amount || 0;
        const newTotalCost = originalCost + additionalCost;
        
        // Extend booking time
        const newEndTime = new Date(new Date(booking.end_time).getTime() + additionalHours * 60 * 60 * 1000);
        
        // Update booking
        await pool.execute(
            'UPDATE Bookings SET end_time = ? WHERE booking_id = ?',
            [newEndTime, bookingId]
        );
        
        // Update payment
        await pool.execute(
            'UPDATE Payments SET amount = ? WHERE booking_id = ?',
            [newTotalCost, bookingId]
        );
        
        res.json({ 
            success: true, 
            originalCost,
            additionalCost,
            newTotalCost,
            newEndTime: newEndTime.toISOString()
        });
    } catch (err) {
        console.error('Extend booking error:', err);
        res.status(500).json({ success: false, message: 'Failed to extend booking' });
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
    console.log('SmartPark Backend running on port', process.env.PORT || 3000);
});