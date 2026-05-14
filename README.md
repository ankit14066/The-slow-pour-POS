# The Slow Pour — Full-Stack POS System

A complete Point of Sale application built for a premium café.
Features real-time order tracking, menu management, coupon validation, staff PIN login, and WhatsApp receipt generation.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Socket.io-client, React Router
- **Backend**: Node.js, Express, Socket.io, Mongoose, JWT
- **Database**: MongoDB Atlas

## Local Setup

### 1. Backend Setup
1. Open terminal and navigate to `backend/` folder:
   ```bash
   cd backend
   npm install
   ```
2. The `.env` file is already configured with your MongoDB Atlas URI.
3. Seed the initial data (this creates the default owner account, menu items, and coupons):
   ```bash
   npm run seed
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will run on http://localhost:4000*

### 2. Frontend Setup
1. Open a new terminal and navigate to `frontend/` folder:
   ```bash
   cd frontend
   npm install
   ```
2. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The Vite app will run on http://localhost:5173*

## Default Login Credentials
After running the seed script, you can log in with:

**Manager/Owner Login (Full Access):**
- Email: `owner@slowpour.com`
- Password: `slowpour123`

**Staff PIN Login (POS & Orders Only):**
- Email: `staff@slowpour.com`
- PIN: `0000`

## Features Included
- **Auth**: JWT-based login with distinct roles (owner, manager, staff). PIN-based fast login for staff. Shift tracking.
- **Menu**: Categories and Items management with custom sizes and availability toggles.
- **POS**: Category tabs, responsive grid, dynamic cart, coupon field, checkout.
- **Orders**: Real-time strip of live orders on the POS screen. Full Orders view to update statuses (`pending` -> `preparing` -> `ready` -> `completed`).
- **Billing**: Calculate GST, apply flat/percent coupons, select payment mode, generate WhatsApp receipts.
- **Dashboard**: Live stats (Revenue, Orders, AOV, Best Seller) auto-updating via WebSockets.
