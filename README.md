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

# Seed with sample data + admin user
node prisma/seed.js
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

## Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@restaurant.com` | `admin123` |
| Kitchen | `kitchen@restaurant.com` | `kitchen123` |

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
