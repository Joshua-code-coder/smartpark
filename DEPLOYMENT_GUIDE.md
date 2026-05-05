# SmartPark Backend Deployment Guide

## Issue: Backend Not Running on Render

The backend is currently not deployed to Render, which is why you're getting registration errors.

## Steps to Deploy Backend to Render:

### 1. Create a Render Account
- Go to https://render.com
- Sign up for a free account

### 2. Connect Your GitHub Repository
- Click "New +" -> "Web Service"
- Connect your GitHub repository containing the SmartPark project

### 3. Configure the Web Service
- **Name**: smartpark-backend
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Instance Type**: Free (or paid for better performance)

### 4. Set Environment Variables
In the Render dashboard, add these environment variables:

```
DB_HOST=your-aiven-host
DB_USER=your-aiven-username
DB_PASSWORD=your-aiven-password
DB_DATABASE=your-database-name
DB_PORT=20534
NODE_ENV=production
```

### 5. Deploy
- Click "Create Web Service"
- Wait for deployment to complete

### 6. Get Your Backend URL
After deployment, Render will give you a URL like:
`https://smartpark-backend-rmc1.onrender.com`

## Alternative: Quick Fix with Mock Data

If you want the app to work immediately without database setup, the backend now has fallback mock data. It will work even without database connection.

## Testing the Backend

Once deployed, test these endpoints:
- Health Check: `https://your-backend-url.onrender.com/health`
- Register: `POST https://your-backend-url.onrender.com/api/register`
- Login: `POST https://your-backend-url.onrender.com/api/login`

## Frontend Configuration

Your frontend is already configured to use:
`https://smartpark-backend-rmc1.onrender.com`

Make sure this matches your deployed backend URL.

## Troubleshooting

If deployment fails:
1. Check the Render logs for errors
2. Ensure all environment variables are set
3. Verify the database connection details from Aiven
4. Make sure the server.js file is in the root of your repository

## Current Status

- Frontend: Deployed on Vercel (Working)
- Backend: Needs deployment on Render
- Database: Aiven Cloud (Ready)

The backend code is ready with:
- Health check endpoint
- Mock data fallback
- Error handling
- CORS enabled
