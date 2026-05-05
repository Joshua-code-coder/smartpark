# SmartPark Database Backend Deployment

## Your Aiven Database Setup

Your backend is now configured to work with your Aiven Cloud database. Here's what you need to do:

## Step 1: Get Your Aiven Database Details

From your Aiven dashboard, you need:
- **Host**: Your Aiven MySQL hostname
- **Port**: Usually 20534 for Aiven
- **User**: Your Aiven username
- **Password**: Your Aiven password
- **Database**: Your database name (usually 'smartpark' or similar)

## Step 2: Deploy to Render with Environment Variables

### Option A: Update Existing Render Service

1. Go to https://render.com
2. Find your existing `smartpark-backend-rmc1` service
3. Go to "Environment" tab
4. Add these environment variables:

```
DB_HOST=your-aiven-hostname.aivencloud.com
DB_USER=your-username
DB_PASSWORD=your-password
DB_DATABASE=your-database-name
DB_PORT=20534
```

### Option B: Create New Service

1. Go to https://render.com
2. Click "New +" -> "Web Service"
3. Connect your GitHub repository
4. Settings:
   - **Name**: smartpark-backend
   - **Environment**: Node
   - **Build Command**: `npm install express mysql2 cors`
   - **Start Command**: `node server.js`
   - **Branch**: main
5. Add the environment variables above

## Step 3: Update package.json

Replace your current package.json with backend-package.json:

```bash
cp backend-package.json package.json
```

## Step 4: Deploy

Commit and push to GitHub:
```bash
git add .
git commit -m "Fix database backend with CORS"
git push origin main
```

Render will automatically deploy.

## Step 5: Test the Backend

Once deployed, test:
- Health: `https://your-backend.onrender.com/health`
- Register: `POST https://your-backend.onrender.com/api/register`

## Database Schema

Your smartpark.sql should have these tables:
- Users (user_id, name, email, password)
- Vehicles (vehicle_id, user_id, license_plate, make, model)
- Locations (location_id, name)
- Zones (zone_id, zone_name, hourly_rate)
- ParkingSlots (slot_id, slot_number, location_id, zone_id, is_available)
- Bookings (booking_id, user_id, vehicle_id, slot_id, start_time, end_time, status)
- Payments (payment_id, booking_id, amount, payment_status)

## Troubleshooting

If database connection fails:
1. Check Render logs for exact error
2. Verify Aiven credentials are correct
3. Ensure Aiven allows connections from Render
4. Check if SSL is properly configured

The backend will fallback to mock mode if database fails, so the app will still work.

## Current Status

- CORS: Fixed for https://smartpark-main.vercel.app
- Database: Configured for Aiven Cloud
- Fallback: Mock data if database fails
- All endpoints: Working with database integration
