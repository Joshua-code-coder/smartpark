const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: ['https://smartpark-main.vercel.app', 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

// Simple in-memory storage
let users = [];
let vehicles = [];
let bookings = [];
let bookingIdCounter = 1;
let userIdCounter = 1;
let vehicleIdCounter = 1;

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'SmartPark Backend is running' });
});

// Register
app.post('/api/register', (req, res) => {
    const { name, email, password, vehicles: userVehicles } = req.body;
    
    if (!name || !email || !password) {
        return res.json({ success: false, message: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.json({ success: false, message: 'Email already registered' });
    }

    // Create new user
    const newUser = {
        user_id: userIdCounter++,
        name,
        email,
        password
    };
    users.push(newUser);

    // Add vehicles if provided
    if (userVehicles && Array.isArray(userVehicles)) {
        for (let plate of userVehicles) {
            if (plate && plate.trim() !== '') {
                vehicles.push({
                    vehicle_id: vehicleIdCounter++,
                    user_id: newUser.user_id,
                    license_plate: plate.trim()
                });
            }
        }
    }

    res.json({ success: true, userId: newUser.user_id, name: newUser.name });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ success: true, user: { user_id: user.user_id, name: user.name } });
    } else {
        // For demo purposes, create a user if not found
        const newUser = {
            user_id: userIdCounter++,
            name: email.split('@')[0] || 'Demo User',
            email,
            password
        };
        users.push(newUser);
        res.json({ success: true, user: { user_id: newUser.user_id, name: newUser.name } });
    }
});

// Get vehicles
app.get('/api/vehicles/:userId', (req, res) => {
    const userVehicles = vehicles.filter(v => v.user_id == req.params.userId);
    res.json({ success: true, vehicles: userVehicles });
});

// Add vehicle
app.post('/api/vehicles', (req, res) => {
    const { userId, licensePlate } = req.body;
    
    if (!userId || !licensePlate) {
        return res.status(400).json({ success: false, message: 'User ID and license plate required' });
    }

    const newVehicle = {
        vehicle_id: vehicleIdCounter++,
        user_id: userId,
        license_plate: licensePlate.trim()
    };
    
    vehicles.push(newVehicle);
    res.json({ success: true, vehicleId: newVehicle.vehicle_id });
});

// Delete vehicle
app.delete('/api/vehicles/:vehicleId', (req, res) => {
    const vehicleId = parseInt(req.params.vehicleId);
    const initialLength = vehicles.length;
    vehicles = vehicles.filter(v => v.vehicle_id !== vehicleId);
    
    res.json({ success: vehicles.length < initialLength });
});

// Mock slots data
const mockSlots = [
    { id: 1, slot_number: 'A-01', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    { id: 2, slot_number: 'A-02', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    { id: 3, slot_number: 'A-03', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    { id: 4, slot_number: 'A-04', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00 },
    { id: 5, slot_number: 'B-01', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    { id: 6, slot_number: 'B-02', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    { id: 7, slot_number: 'B-03', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    { id: 8, slot_number: 'B-04', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50 },
    { id: 9, slot_number: 'C-01', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    { id: 10, slot_number: 'C-02', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    { id: 11, slot_number: 'C-03', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    { id: 12, slot_number: 'C-04', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50 },
    { id: 13, slot_number: 'D-01', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 },
    { id: 14, slot_number: 'D-02', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 },
    { id: 15, slot_number: 'D-03', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 },
    { id: 16, slot_number: 'D-04', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00 }
];

// Get slots
app.get('/api/slots', (req, res) => {
    res.json({ success: true, slots: mockSlots });
});

// Create booking
app.post('/api/book', (req, res) => {
    const { userId, vehicleId, slotId, durationHours } = req.body;
    
    if (!userId || !vehicleId || !slotId || !durationHours) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const slot = mockSlots.find(s => s.id === parseInt(slotId));
    if (!slot) {
        return res.status(400).json({ success: false, message: 'Invalid slot selected' });
    }

    const amount = durationHours * slot.hourly_rate;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    const newBooking = {
        booking_id: bookingIdCounter++,
        user_id: userId,
        vehicle_id: vehicleId,
        slot_id: slotId,
        start_time: startTime,
        end_time: endTime,
        amount
    };

    bookings.push(newBooking);

    res.json({ success: true, bookingId: newBooking.booking_id, amount });
});

// Get history
app.get('/api/history/:userId', (req, res) => {
    const userBookings = bookings
        .filter(b => b.user_id == req.params.userId)
        .map(booking => {
            const vehicle = vehicles.find(v => v.vehicle_id === booking.vehicle_id);
            const slot = mockSlots.find(s => s.id === booking.slot_id);
            
            return {
                id: booking.booking_id,
                license_plate: vehicle ? vehicle.license_plate : 'Unknown',
                amount: booking.amount.toString(),
                start_time: booking.start_time.toISOString(),
                end_time: booking.end_time.toISOString(),
                location: 'SmartPark',
                slot_number: slot ? slot.slot_number : 'Unknown',
                durationMins: Math.round((booking.end_time - booking.start_time) / (1000 * 60))
            };
        })
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    res.json({ success: true, history: userBookings });
});

// Extend booking
app.post('/api/extend-booking', (req, res) => {
    const { bookingId, additionalHours, userId } = req.body;
    
    if (!bookingId || !additionalHours || !userId) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const booking = bookings.find(b => b.booking_id == bookingId && b.user_id == userId);
    
    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const slot = mockSlots.find(s => s.id === booking.slot_id);
    const hourlyRate = slot ? slot.hourly_rate : 5.00;
    
    const additionalCost = additionalHours * hourlyRate;
    const originalCost = booking.amount;
    const newTotalCost = originalCost + additionalCost;
    
    booking.end_time = new Date(booking.end_time.getTime() + additionalHours * 60 * 60 * 1000);
    booking.amount = newTotalCost;

    res.json({ 
        success: true, 
        originalCost,
        additionalCost,
        newTotalCost,
        newEndTime: booking.end_time.toISOString()
    });
});

// Admin dashboard
app.get('/api/admin/dashboard', (req, res) => {
    const totalRevenue = bookings.reduce((sum, b) => sum + b.amount, 0);
    res.json({ 
        success: true, 
        stats: { 
            totalRevenue: totalRevenue, 
            totalUsers: users.length 
        } 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SmartPark Backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
