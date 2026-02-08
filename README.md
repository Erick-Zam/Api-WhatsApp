# WhatsApp API SaaS Platform 🚀

A comprehensive, open-source SaaS platform for automating WhatsApp communication. Built with **Node.js** (Backend) and **Next.js 14** (Frontend), this project enables developers to integrate WhatsApp messaging capabilities into their applications via a simple REST API.

![Dashboard Preview](https://via.placeholder.com/800x400?text=WhatsApp+SaaS+Dashboard) 
*(Replace with actual screenshot after running)*

## 📖 Overview

This project transforms the popular [Baileys](https://github.com/WhiskeySockets/Baileys) library into a robust, multi-user **SaaS platform**. It allows users to register, manage their API keys, connect devices via QR code, and send various types of messages programmatically.

Unlike simple bot scripts, this architecture is designed for scalability and ease of use, featuring a modern dashboard and interactive documentation.

## ✨ Key Features

- **Multi-User Architecture**: Support for user registration (`/auth/register`) and login (`/auth/login`) with JWT.
- **RESTful API**: Standard HTTP endpoints for all actions.
- **Advanced Messaging**:
  - 📝 **Text**: Simple messages.
  - 📷 **Media**: Send Images, Videos, Audio (Voice Notes), and Documents.
  - 📊 **Polls**: Interactive questions with multiple options.
  - 📍 **Location**: Share coordinates.
  - 👤 **Contacts**: Send vCards.
  - ✍️ **Presence**: Simulate "typing..." and "recording..." status.
- **Real-Time QR Code**: Connect devices seamlessly via the frontend dashboard.
- **Secure Authentication**: API routes protected by `x-api-key`.
- **Logging & Audit**: Built-in structure for tracking message history and system errors.

## 🏗 Architecture

The project follows a modern monorepo structure:

| Component | Technology | Description |
|-----------|------------|-------------|
| **Backend** | Node.js, Express | REST API, WebSocket (Baileys), Auth Logic |
| **Frontend** | Next.js 14, React | Dashboard, Docs, Landing Page, Tailwind CSS |
| **Database** | PostgreSQL | User data, Session storage, Logs (Schema provided) |

### Directory Structure
```
Api-WhatsApp/
├── Backend/            # Express Server
│   ├── src/
│   │   ├── services/   # Auth, Logger logic
│   │   ├── routes/     # API Endpoints (Messages, Auth)
│   │   ├── middleware/ # API Key & JWT checks
│   │   └── whatsapp.js # Core Baileys logic
├── frontend/           # Next.js Application
│   ├── src/app/        # Pages (Dashboard, Login, Docs)
│   └── components/     # UI Components
└── docs/               # Documentation & Schemas
    ├── database/       # SQL Init Scripts
    └── OFFICIAL_API.md # Comparison with Meta Cloud API
```

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher.
- **PostgreSQL**: (Optional for demo, required for production persistence).

### 1. Backend Setup
Navigate to the `Backend` directory and install dependencies:
```bash
cd Backend
npm install
```
Start the server:
```bash
npm start
# Server running on http://localhost:3001
```

### 2. Frontend Setup
Navigate to the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```
Start the development server:
```bash
npm run dev
# Dashboard running on http://localhost:3000
```

## 📚 Usage Guide

### connecting a Device
1.  Open the **Frontend** (`http://localhost:3000`).
2.  Click **Login** (Use demo credentials or register).
3.  Go to the **Dashboard**.
4.  Scan the displayed **QR Code** with your WhatsApp mobile app (Linked Devices).

### Sending a Message (API)
Once connected, you can use the API. Requires header `x-api-key: <your-key>`.

**Example: Send a text**
```bash
curl -X POST http://localhost:3001/messages/text \
  -H "Content-Type: application/json" \
  -H "x-api-key: default-secure-key" \
  -d '{"phone": "593991234567", "message": "Hello from API!"}'
```

**Example: Send a Poll**
```bash
curl -X POST http://localhost:3001/messages/poll \
  -H "Content-Type: application/json" \
  -H "x-api-key: default-secure-key" \
  -d '{
    "phone": "593991234567",
    "name": "Do you like this API?",
    "values": ["Yes", "No"],
    "singleSelect": true
  }'
```

See the full [Interactive Documentation](http://localhost:3000/docs) after running the frontend.

## 🗄 Database Setup
For production, set up the PostgreSQL database using the provided schema:
1.  Install PostgreSQL.
2.  Run the script located at `docs/database/schema.sql`.
3.  Configure your environment variables in `.env` to point to your DB.

## 🛡️ Disclaimer & Terms
This project uses the **Baileys** library, which is an unofficial WhatsApp API.
- **Use Responsibly**: Do not use this for spamming or bulk marketing.
- **Risk**: Your number *can* be banned by WhatsApp if you violate their Terms of Service.
- **Recommendation**: For enterprise-scale or critical business notifications, consider using the [Official WhatsApp Cloud API](docs/OFFICIAL_API.md).

## 📄 License
MIT License. Free to use and modify.
