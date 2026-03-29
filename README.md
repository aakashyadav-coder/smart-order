# Smart Order 🍽️ — Restaurant QR Ordering System

A full-stack restaurant ordering system where customers scan a QR code at their table, browse the menu, place orders, and track live status. Kitchen staff manage orders through a real-time dashboard with Socket.io notifications.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM |
| Real-time | Socket.io |
| SMS / OTP | Twilio (console mock if not configured) |
| Auth | JWT (jsonwebtoken + bcryptjs) |

---

## Project Structure

```
smart-order/
  client/          ← React frontend (Vite)
  server/          ← Node.js backend (Express)
  README.md
```

---

## Prerequisites

- **Node.js** v18+ 
- **PostgreSQL** database (local or cloud)
- (Optional) **Twilio** account for real SMS OTPs

---

## Setup Instructions

### 1. Clone & navigate

```bash
cd d:\document1\smart-order
```

### 2. Configure the server

```bash
cd server
copy .env.example .env
```

Edit `server/.env`:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/smart_order"
JWT_SECRET=any_long_random_string_here

# Optional Twilio (leave blank to use console mock)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### 3. Install server dependencies

```bash
cd server
npm install
```

### 4. Initialize database

```bash
# Push schema to PostgreSQL
npx prisma db push

# Seed base data (restaurant, menu, features)
node prisma/seed.js
```

### 4a. Create a Super Admin user (recommended)

Run the helper script with CLI arguments:

```bash
cd server
node createSuperAdmin.js --email "YOUR_EMAIL" --password "YOUR_STRONG_PASSWORD" --name "YOUR_NAME"
```

Or use environment variables (PowerShell):

```powershell
$env:SUPER_ADMIN_EMAIL="YOUR_EMAIL"
$env:SUPER_ADMIN_PASSWORD="YOUR_STRONG_PASSWORD"
$env:SUPER_ADMIN_NAME="YOUR_NAME"
node createSuperAdmin.js
```

### 5. Install client dependencies

```bash
cd ..\client
npm install
```

---

## Running the Application

### Start the backend server

```bash
cd server
npm run dev
# → Running on http://localhost:5000
```

### Start the frontend (new terminal)

```bash
cd client
npm run dev
# → Running on http://localhost:5173
```

---

## Application URLs

| URL | Description |
|---|---|
| `http://localhost:5173/menu?table=3` | Customer menu (Table 3) |
| `http://localhost:5173/kitchen/login` | Kitchen staff login |
| `http://localhost:5173/kitchen` | Kitchen dashboard (after login) |
| `http://localhost:5173/admin/qr` | QR code generator |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user info |
| GET | `/api/menu` | No | Menu items by category |
| POST | `/api/orders` | No | Place new order |
| GET | `/api/orders` | JWT | All orders (kitchen) |
| GET | `/api/orders/:id` | No | Single order (customer) |
| PUT | `/api/orders/:id/status` | JWT | Update order status |
| POST | `/api/otp/send` | JWT | Send OTP to customer |
| POST | `/api/otp/verify` | No | Verify customer OTP |

---

## Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `join_kitchen` | Client → Server | Kitchen joins broadcast room |
| `join_order_room` | Client → Server | Customer joins their order's room |
| `new_order` | Server → Kitchen | Notifies kitchen of new order |
| `order_status_update` | Server → Customer | Sends status change to customer |

---

## Features

- 📱 **QR Table System** — unique URL per table with table number in query param
- 🗂 **Categorized Menu** — items grouped by Drinks / Starters / Main Course / Desserts
- 🛒 **Smart Cart** — add/remove/update quantities with live total
- 📋 **Checkout Flow** — captures customer name and phone, validates before submitting
- 🔔 **Real-time Kitchen** — Socket.io streams new orders live with audio notification
- 📊 **Order Lifecycle** — Pending → Accepted → Preparing → Completed
- 🔐 **OTP via SMS** — sends 6-digit OTP via Twilio when order is accepted (mock mode if no Twilio)
- 📈 **Live Status Tracking** — customer sees animated progress bar updating in real-time
- 🏷️ **QR Generator** — printable QR codes for all tables in the admin panel
- 🔒 **JWT Auth** — kitchen/admin login with 8-hour sessions

---

## Environment Variables Reference

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `PORT` | No | Server port (default: 5000) |
| `CLIENT_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |
| `TWILIO_ACCOUNT_SID` | No | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | No | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | No | Twilio sender phone number |

### Optional Seed Variables

| Variable | Required | Description |
|---|---|---|
| `SEED_SUPER_EMAIL` | No | Email for creating a SUPER_ADMIN during `prisma/seed.js` |
| `SEED_SUPER_PASSWORD` | No | Password for the SUPER_ADMIN seed user |
| `SEED_SUPER_NAME` | No | Name for the SUPER_ADMIN seed user |
| `SEED_OWNER_EMAIL` | No | Email for creating an OWNER during `prisma/seed.js` |
| `SEED_OWNER_PASSWORD` | No | Password for the OWNER seed user |
| `SEED_OWNER_NAME` | No | Name for the OWNER seed user |
| `SEED_KITCHEN_EMAIL` | No | Email for creating a KITCHEN user during `prisma/seed.js` |
| `SEED_KITCHEN_PASSWORD` | No | Password for the KITCHEN seed user |
| `SEED_KITCHEN_NAME` | No | Name for the KITCHEN seed user |

### Super Admin Helper Variables

| Variable | Required | Description |
|---|---|---|
| `SUPER_ADMIN_EMAIL` | No | Email used by `createSuperAdmin.js` when `--email` is not provided |
| `SUPER_ADMIN_PASSWORD` | No | Password used by `createSuperAdmin.js` when `--password` is not provided |
| `SUPER_ADMIN_NAME` | No | Name used by `createSuperAdmin.js` when `--name` is not provided |
