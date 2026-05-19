const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || "defaultdb",
  port: Number(process.env.DB_PORT) || 3306,
  ssl: process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10
});

function getRate(slotNumber = "") {
  const zone = slotNumber.charAt(0).toUpperCase();
  if (zone === "A") return 5.0;
  if (zone === "B") return 3.5;
  if (zone === "C") return 2.5;
  return 5.0;
}

app.get("/", (req, res) => {
  res.json({ success: true, message: "SmartPark backend running" });
});

app.get("/health", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT DATABASE() AS db");
    res.json({ success: true, db: rows[0].db });
  } catch (err) {
    res.status(500).json({ success: false, message: "DB connection failed" });
  }
});

app.post("/api/register", async (req, res) => {
  const { name, email, password, vehicles } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required" });
  }

  try {
    const [userRes] = await pool.execute(
      "INSERT INTO Users (name, email, password) VALUES (?, ?, ?)",
      [name, email, password]
    );

    const userId = userRes.insertId;

    if (Array.isArray(vehicles)) {
      for (const plate of vehicles) {
        if (plate && plate.trim()) {
          await pool.execute(
            "INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)",
            [userId, plate.trim().toUpperCase()]
          );
        }
      }
    }

    res.json({ success: true, userId, user: { user_id: userId, name, email } });
  } catch (err) {
    console.error("Register error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute(
      "SELECT user_id, name, email FROM Users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    res.json({ success: true, user: rows[0], userId: rows[0].user_id });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

app.get("/api/vehicles/:userId", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        vehicle_id AS id,
        license_plate AS plate,
        license_plate
       FROM Vehicles
       WHERE user_id = ?
       ORDER BY vehicle_id DESC`,
      [req.params.userId]
    );

    res.json({ success: true, vehicles: rows });
  } catch (err) {
    console.error("Vehicles error:", err);
    res.status(500).json({ success: false, vehicles: [] });
  }
});

app.post("/api/vehicles", async (req, res) => {
  const { userId, licensePlate } = req.body;

  if (!userId || !licensePlate) {
    return res.status(400).json({ success: false, message: "User and license plate required" });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO Vehicles (user_id, license_plate) VALUES (?, ?)",
      [userId, licensePlate.trim().toUpperCase()]
    );

    res.json({ success: true, vehicleId: result.insertId });
  } catch (err) {
    console.error("Add vehicle error:", err);
    res.status(500).json({ success: false, message: "Failed to add vehicle" });
  }
});

app.delete("/api/vehicles/:vehicleId", async (req, res) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM Vehicles WHERE vehicle_id = ?",
      [req.params.vehicleId]
    );

    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    console.error("Delete vehicle error:", err);
    res.status(500).json({ success: false, message: "Failed to delete vehicle" });
  }
});

app.get("/api/slots", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        ps.slot_id AS id,
        ps.slot_number,
        ps.is_available,
        ps.is_available AS available,
        l.name AS location
      FROM ParkingSlots ps
      JOIN Locations l ON ps.location_id = l.location_id
      WHERE ps.is_available = TRUE
      ORDER BY ps.slot_id
    `);

    const slots = rows.map(slot => ({
      ...slot,
      hourly_rate: getRate(slot.slot_number)
    }));

    res.json({ success: true, slots });
  } catch (err) {
    console.error("Slots error:", err);
    res.status(500).json({ success: false, message: "Failed to load slots", slots: [] });
  }
});

app.post("/api/book", async (req, res) => {
  const { userId, vehicleId, slotId, durationHours } = req.body;

  if (!userId || !vehicleId || !slotId || !durationHours) {
    return res.status(400).json({ success: false, message: "All booking fields are required" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [slotRows] = await conn.execute(
      "SELECT slot_id, slot_number, is_available FROM ParkingSlots WHERE slot_id = ? FOR UPDATE",
      [slotId]
    );

    if (slotRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    if (!slotRows[0].is_available) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "This slot is already booked" });
    }

    const [vehicleRows] = await conn.execute(
      "SELECT vehicle_id FROM Vehicles WHERE vehicle_id = ? AND user_id = ?",
      [vehicleId, userId]
    );

    if (vehicleRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Vehicle does not belong to this user" });
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + Number(durationHours) * 60 * 60 * 1000);
    const amount = Number(durationHours) * getRate(slotRows[0].slot_number);

    const [bookingResult] = await conn.execute(
      `INSERT INTO Bookings 
       (user_id, vehicle_id, slot_id, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [userId, vehicleId, slotId, startTime, endTime]
    );

    await conn.execute(
      "INSERT INTO Payments (booking_id, amount, payment_status) VALUES (?, ?, 'paid')",
      [bookingResult.insertId, amount]
    );

    await conn.commit();

    res.json({
      success: true,
      bookingId: bookingResult.insertId,
      amount
    });
  } catch (err) {
    await conn.rollback();
    console.error("Booking error:", err);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  } finally {
    conn.release();
  }
});

app.get("/api/history/:userId", async (req, res) => {
  try {
    const [history] = await pool.execute(`
      SELECT
        b.booking_id AS id,
        v.license_plate,
        p.amount,
        b.start_time,
        b.end_time,
        b.status,
        l.name AS location,
        ps.slot_number,
        TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) AS durationMins
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
    console.error("History error:", err);
    res.status(500).json({ success: false, history: [] });
  }
});

app.post("/api/complete-booking/:bookingId", async (req, res) => {
  try {
    const [result] = await pool.execute(
      "UPDATE Bookings SET status = 'completed' WHERE booking_id = ?",
      [req.params.bookingId]
    );

    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    console.error("Complete booking error:", err);
    res.status(500).json({ success: false, message: "Failed to complete booking" });
  }
});

app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const [revRows] = await pool.execute("SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM Payments");
    const [userRows] = await pool.execute("SELECT COUNT(*) AS totalUsers FROM Users");
    const [bookingRows] = await pool.execute("SELECT COUNT(*) AS totalBookings FROM Bookings");
    const [slotRows] = await pool.execute("SELECT COUNT(*) AS availableSlots FROM ParkingSlots WHERE is_available = TRUE");

    res.json({
      success: true,
      stats: {
        totalRevenue: revRows[0].totalRevenue,
        totalUsers: userRows[0].totalUsers,
        totalBookings: bookingRows[0].totalBookings,
        availableSlots: slotRows[0].availableSlots
      }
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).json({ success: false, message: "Failed to load admin data" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 SmartPark Backend running on port", PORT);
});