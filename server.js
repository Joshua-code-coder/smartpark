const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock vehicle storage
let mockVehicles = [];

// Mock booking storage
let mockBookings = [
    {
        id: 1,
        user_id: 1,
        vehicle_id: 1,
        slot_id: 5,
        start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        amount: 10.50,
        license_plate: 'A76724',
        slot_number: 'B-03',
        location: 'SmartPark'
    },
    {
        id: 2,
        user_id: 1,
        vehicle_id: 2,
        slot_id: 1,
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        amount: 15.00,
        license_plate: 'B12345',
        slot_number: 'A-02',
        location: 'SmartPark'
    },
    {
        id: 3,
        user_id: 1,
        vehicle_id: 3,
        slot_id: 9,
        start_time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        amount: 5.00,
        license_plate: 'C98765',
        slot_number: 'C-01',
        location: 'SmartPark'
    }
];

// Mock slot storage with geolocation
let mockSlots = [
    // Zone A slots (Premium) - 5 AED/hr - Dubai Mall area
    { id: 1, slot_number: 'A-01', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00, lat: 25.1972, lng: 55.2744 },
    { id: 2, slot_number: 'A-02', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00, lat: 25.1972, lng: 55.2744 },
    { id: 3, slot_number: 'A-03', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00, lat: 25.1972, lng: 55.2744 },
    { id: 4, slot_number: 'A-04', location: 'SmartPark', available: true, zone_name: 'A', hourly_rate: 5.00, lat: 25.1972, lng: 55.2744 },
    // Zone B slots (Mid-High) - 3.5 AED/hr - Mall of Emirates area
    { id: 5, slot_number: 'B-01', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50, lat: 25.1185, lng: 55.1975 },
    { id: 6, slot_number: 'B-02', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50, lat: 25.1185, lng: 55.1975 },
    { id: 7, slot_number: 'B-03', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50, lat: 25.1185, lng: 55.1975 },
    { id: 8, slot_number: 'B-04', location: 'SmartPark', available: true, zone_name: 'B', hourly_rate: 3.50, lat: 25.1185, lng: 55.1975 },
    // Zone C slots (Mid-Low) - 2.5 AED/hr - Business Bay area
    { id: 9, slot_number: 'C-01', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50, lat: 25.1850, lng: 55.2680 },
    { id: 10, slot_number: 'C-02', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50, lat: 25.1850, lng: 55.2680 },
    { id: 11, slot_number: 'C-03', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50, lat: 25.1850, lng: 55.2680 },
    { id: 12, slot_number: 'C-04', location: 'SmartPark', available: true, zone_name: 'C', hourly_rate: 2.50, lat: 25.1850, lng: 55.2680 },
    // Zone D slots (Economy) - 2 AED/hr - Deira area
    { id: 13, slot_number: 'D-01', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00, lat: 25.2667, lng: 55.3167 },
    { id: 14, slot_number: 'D-02', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00, lat: 25.2667, lng: 55.3167 },
    { id: 15, slot_number: 'D-03', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00, lat: 25.2667, lng: 55.3167 },
    { id: 16, slot_number: 'D-04', location: 'SmartPark', available: true, zone_name: 'D', hourly_rate: 2.00, lat: 25.2667, lng: 55.3167 }
];

// Function to calculate distance between two coordinates (in km)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Helper function to get slot number from slot ID
function getSlotNumber(slotId) {
    const slotNumbers = {
        1: 'A-01', 2: 'A-02', 3: 'A-03', 4: 'A-04',  // Zone A
        5: 'B-01', 6: 'B-02', 7: 'B-03', 8: 'B-04',  // Zone B
        9: 'C-01', 10: 'C-02', 11: 'C-03', 12: 'C-04', // Zone C
        13: 'D-01', 14: 'D-02', 15: 'D-03', 16: 'D-04'  // Zone D
    };
    return slotNumbers[slotId] || 'Unknown';
}

// 1. DATABASE CONNECTION
// 1. DATABASE CONNECTION
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'jahnavi',
    port: 3309,
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
                    // Always save to mock storage for persistence
                    if (!mockVehicles) {
                        mockVehicles = [];
                    }
                    
                    const newVehicle = {
                        id: mockVehicles.length + 1,
                        plate: plate.trim(),
                        license_plate: plate.trim(),
                        user_id: userId
                    };
                    
                    mockVehicles.push(newVehicle);
                    console.log('Vehicle saved to mock storage during registration:', newVehicle);
                    
                    // Also try database for persistence
                    try {
                        await pool.execute('INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)', [userId, plate.trim()]);
                    } catch (err) {
                        console.log('Database insert failed, but vehicle saved to mock storage');
                    }
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
        // Try database first for vehicles added during registration
        const [rows] = await pool.execute('SELECT vehicle_id as id, license_plate as plate, make, model FROM Vehicles WHERE user_id = ?', [req.params.userId]);
        console.log('Found vehicles in database:', rows.length);
        
        // Also check mock storage for any vehicles added via API
        if (!mockVehicles) {
            mockVehicles = [];
        }
        
        const mockUserVehicles = mockVehicles.filter(v => v.user_id == req.params.userId);
        console.log('Found vehicles in mock storage:', mockUserVehicles.length);
        
        // Combine database and mock vehicles (avoid duplicates)
        const allVehicles = [...rows];
        mockUserVehicles.forEach(mockVehicle => {
            if (!allVehicles.find(dbVehicle => dbVehicle.id === mockVehicle.id)) {
                allVehicles.push(mockVehicle);
            }
        });
        
        console.log('Total vehicles for user:', allVehicles.length);
        res.json({ success: true, vehicles: allVehicles });
    } catch (err) {
        console.log('Database connection failed, using mock vehicle storage for user', req.params.userId);
        
        if (!mockVehicles) {
            mockVehicles = [];
        }
        
        const userVehicles = mockVehicles.filter(v => v.user_id == req.params.userId);
        console.log('User vehicles found in mock storage:', userVehicles.length);
        res.json({ success: true, vehicles: userVehicles });
    }
});

// 4a. ADD VEHICLE
app.post('/api/vehicles', async (req, res) => {
    const { userId, licensePlate } = req.body;
    
    // Force mock storage to ensure immediate consistency
    console.log('Adding vehicle to mock storage:', licensePlate);
    
    if (!userId || !licensePlate) {
        return res.status(400).json({ success: false, message: 'User ID and license plate required' });
    }
    
    // Use persistent mock vehicle storage
    if (!mockVehicles) {
        mockVehicles = [];
    }
    
    const newVehicle = {
        id: mockVehicles.length + 1,
        plate: licensePlate.trim(),
        license_plate: licensePlate.trim(),
        user_id: userId
    };
    
    mockVehicles.push(newVehicle);
    console.log('Mock vehicle added:', newVehicle);
    console.log('Total vehicles in storage:', mockVehicles.length);
    res.json({ success: true, vehicleId: newVehicle.id });
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
        if (mockVehicles) {
            const initialLength = mockVehicles.length;
            mockVehicles = mockVehicles.filter(v => v.id != req.params.vehicleId);
            if (mockVehicles.length < initialLength) {
                return res.json({ success: true });
            }
        }
        res.status(500).json({ success: false, message: 'Failed to delete vehicle' });
    }
});

// ==========================================
// BOOKING & HISTORY ROUTES
// ==========================================

// 5. GET AVAILABLE SLOTS (For the booking dropdowns)
app.get('/api/slots', async (req, res) => {
    try {
        // Try database first
        const [rows] = await pool.execute(`
            SELECT ps.slot_id as id, ps.slot_number, l.name as location, ps.is_available as available,
                   z.zone_name, z.hourly_rate
            FROM ParkingSlots ps 
            JOIN Locations l ON ps.location_id = l.location_id 
            JOIN Zones z ON ps.zone_id = z.zone_id
            WHERE ps.is_available = TRUE
            ORDER BY z.zone_name, ps.slot_number
        `);
        res.json({ success: true, slots: rows });
    } catch (err) {
        console.log('Database connection failed, using mock data with geolocation');
        
        // Get user location from query params
        const { lat, lng } = req.query;
        let availableSlots = mockSlots.filter(slot => slot.available);
        
        // If user location provided, sort by distance
        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            
            availableSlots = availableSlots.map(slot => ({
                ...slot,
                distance: calculateDistance(userLat, userLng, slot.lat, slot.lng)
            })).sort((a, b) => a.distance - b.distance);
            
            console.log(`Slots sorted by distance from user location (${userLat}, ${userLng})`);
        }
        
        res.json({ success: true, slots: availableSlots });
    }
});

// 6. CREATE BOOKING
app.post('/api/book', async (req, res) => {
    const { userId, vehicleId, slotId, durationHours } = req.body;
    
    // Validate input parameters
    if (!userId || !vehicleId || !slotId || !durationHours) {
        return res.status(400).json({ success: false, message: 'All fields are required. Please select a vehicle, slot, and duration.' });
    }
    
    if (durationHours < 1) {
        return res.status(400).json({ success: false, message: 'Duration must be at least 1 hour.' });
    }
    
    try {
        // Try database first
        const [zoneRows] = await pool.execute(`
            SELECT z.hourly_rate
            FROM ParkingSlots ps
            JOIN Zones z ON ps.zone_id = z.zone_id
            WHERE ps.slot_id = ?
        `, [slotId]);
        
        if (zoneRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid slot selected. Please choose a valid parking slot.' });
        }
        
        const hourlyRate = zoneRows[0].hourly_rate;
        const amount = durationHours * hourlyRate;
        
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000); // Convert hours to milliseconds
        
        const [bookRes] = await pool.execute(
            'INSERT INTO Bookings (user_id, vehicle_id, slot_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, "active")',
            [userId, vehicleId, slotId, startTime, endTime]
        );
        
        await pool.execute(
            'INSERT INTO Payments (booking_id, amount, payment_status) VALUES (?, ?, "paid")',
            [bookRes.insertId, amount]
        );
        
        res.json({ success: true, bookingId: bookRes.insertId, amount });
    } catch (err) {
        console.log('Database connection failed, using mock booking');
        // Fallback to mock booking if database fails
        const mockSlotRates = {
            1: 5.00, 2: 5.00, 3: 5.00, 4: 5.00,  // Zone A
            5: 3.50, 6: 3.50, 7: 3.50, 8: 3.50,  // Zone B
            9: 2.50, 10: 2.50, 11: 2.50, 12: 2.50, // Zone C
            13: 2.00, 14: 2.00, 15: 2.00, 16: 2.00  // Zone D
        };
        
        // Validate slot exists
        const selectedSlot = mockSlots.find(s => s.id == slotId);
        if (!selectedSlot) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid slot selected. Please choose a valid parking slot.' 
            });
        }
        
        // Check if slot is already booked by this user (edge case prevention)
        const userAlreadyBookedSlot = mockBookings.some(booking => 
            booking.slot_id == slotId && 
            booking.user_id == userId &&
            booking.status === 'active' &&
            new Date(booking.end_time) > new Date()
        );
        
        if (userAlreadyBookedSlot) {
            return res.status(400).json({ 
                success: false, 
                message: 'You already have an active booking for this slot. Please wait until your current parking time is over or choose a different slot.' 
            });
        }
        
        // Check if slot is already booked by another user
        const slotAlreadyBooked = mockBookings.some(booking => 
            booking.slot_id == slotId && 
            booking.user_id != userId &&
            booking.status === 'active' &&
            new Date(booking.end_time) > new Date()
        );
        
        if (slotAlreadyBooked) {
            return res.status(400).json({ 
                success: false, 
                message: 'Slot is already booked by another user. Please choose another slot.' 
            });
        }
        
        // Get the actual license plate from vehicles data
        let licensePlate = 'Unknown';
        try {
            const [vehicleRows] = await pool.execute(
                'SELECT license_plate FROM Vehicles WHERE vehicle_id = ? AND user_id = ?',
                [vehicleId, userId]
            );
            if (vehicleRows.length > 0) {
                licensePlate = vehicleRows[0].license_plate;
                console.log('Found vehicle in database:', licensePlate);
            } else {
                console.log('Vehicle not found in database, checking mock storage');
                // Try mock storage as fallback
                if (!mockVehicles) {
                    mockVehicles = [];
                }
                
                const vehicle = mockVehicles.find(v => v.id == vehicleId && v.user_id == userId);
                if (vehicle) {
                    licensePlate = vehicle.license_plate;
                    console.log('Found vehicle in mock storage:', vehicle);
                } else {
                    console.log('Vehicle not found in mock storage for booking');
                    console.log('Available vehicles:', mockVehicles.map(v => ({ id: v.id, plate: v.license_plate, user_id: v.user_id })));
                    return res.status(400).json({ success: false, message: 'Vehicle not found. Please add a vehicle first.' });
                }
            }
        } catch (err) {
            console.log('Database connection failed, using mock vehicle storage');
            // Use mock vehicle storage if database fails
            if (!mockVehicles) {
                mockVehicles = [];
            }
            
            const vehicle = mockVehicles.find(v => v.id == vehicleId && v.user_id == userId);
            if (vehicle) {
                licensePlate = vehicle.license_plate;
                console.log('Found vehicle in mock storage:', vehicle);
            } else {
                console.log('Vehicle not found in mock storage for booking');
                console.log('Available vehicles:', mockVehicles.map(v => ({ id: v.id, plate: v.license_plate, user_id: v.user_id })));
                return res.status(400).json({ success: false, message: 'Vehicle not found. Please add a vehicle first.' });
            }
        }
        
        // Calculate amount using slot hourly rate
        const amount = durationHours * selectedSlot.hourly_rate;
        
        // Generate mock booking ID
        const bookingId = Math.floor(Math.random() * 1000) + 1;
        
        // Save to mock bookings storage
        const newBooking = {
            id: bookingId,
            user_id: userId,
            vehicle_id: vehicleId,
            slot_id: slotId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
            status: 'active',
            amount: amount,
            license_plate: licensePlate, // Use actual license plate from vehicles
            slot_number: getSlotNumber(slotId),
            location: 'SmartPark'
        };
        
        mockBookings.push(newBooking);
        
        // Mark slot as unavailable in mock slots
        const slotToUpdate = mockSlots.find(s => s.id === slotId);
        if (slotToUpdate) {
            slotToUpdate.available = false;
        }
        
        console.log('Mock booking created and saved:', newBooking);
        console.log('Total bookings in storage:', mockBookings.length);
        console.log('All booking IDs:', mockBookings.map(b => b.id));
        
        res.json({ success: true, bookingId, amount });
    }
});

// 7. GET USER HISTORY 
app.get('/api/history/:userId', async (req, res) => {
    try {
        // Force mock data by making database query fail
        throw new Error('Forcing mock data');
        
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
        console.log('Using dynamic mock history data');
        // Return user's bookings from mock storage
        const userBookings = mockBookings
            .filter(booking => booking.user_id == req.params.userId)
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
            .map(booking => ({
                id: booking.id,
                license_plate: booking.license_plate,
                amount: booking.amount.toString(),
                start_time: booking.start_time,
                end_time: booking.end_time,
                location: booking.location,
                slot_number: booking.slot_number,
                durationMins: Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / (1000 * 60)) // Calculate duration in minutes
            }));
        
        res.json({ success: true, history: userBookings });
    }
});

// 8. EXTEND BOOKING
app.post('/api/extend-booking', async (req, res) => {
    const { bookingId, additionalHours, userId } = req.body;
    
    // Always use mock data for consistency
    console.log('Extending booking:', { bookingId, additionalHours, userId });
    console.log('Current mock bookings:', mockBookings.map(b => ({ id: b.id, user_id: b.user_id, status: b.status })));
    
    // Find the booking in mock storage with more flexible matching
    const booking = mockBookings.find(b => {
        const idMatch = String(b.id) === String(bookingId);
        const userMatch = String(b.user_id) === String(userId);
        const statusMatch = b.status === 'active';
        console.log('Checking booking', b.id, ':', { idMatch, userMatch, statusMatch });
        return idMatch && userMatch && statusMatch;
    });
    
    if (!booking) {
        console.log('Booking not found. Available IDs:', mockBookings.map(b => b.id));
        return res.status(404).json({ success: false, message: 'Booking not found or not active' });
    }
    
    console.log('Found booking to extend:', booking);
    
    // Extend the booking
    const currentEndTime = new Date(booking.end_time);
    const newEndTime = new Date(currentEndTime.getTime() + additionalHours * 60 * 60 * 1000);
    booking.end_time = newEndTime.toISOString();
    
    // Calculate additional cost and new total cost using zone-based pricing
    console.log('Debug - Booking slot_id:', booking.slot_id, 'Type:', typeof booking.slot_id);
    console.log('Debug - Available slots:', mockSlots.map(s => ({ id: s.id, zone: s.zone_name, rate: s.hourly_rate })));
    
    // Fix type mismatch - convert both to same type for comparison
    const bookingSlotId = parseInt(booking.slot_id);
    const slot = mockSlots.find(s => s.id === bookingSlotId);
    console.log('Debug - Found slot:', slot, 'after type conversion');
    
    const hourlyRate = slot ? slot.hourly_rate : 5.00;
    console.log('Debug - Hourly rate used:', hourlyRate, 'Slot zone:', slot ? slot.zone_name : 'Unknown');
    
    const additionalCost = additionalHours * hourlyRate;
    console.log('Debug - Additional cost calculation:', additionalHours, '×', hourlyRate, '=', additionalCost);
    const originalCost = booking.amount || 0;
    const newTotalCost = originalCost + additionalCost;
    
    // Update the booking amount to reflect the new total
    booking.amount = newTotalCost;
    
    console.log('Booking extended successfully:', { 
        bookingId, 
        additionalHours, 
        oldEndTime: currentEndTime.toISOString(),
        newEndTime: newEndTime.toISOString(), 
        originalCost,
        additionalCost,
        newTotalCost
    });
    
    res.json({ 
        success: true, 
        newEndTime: newEndTime.toISOString(),
        originalCost: originalCost,
        additionalCost: additionalCost,
        newTotalCost: newTotalCost
    });
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