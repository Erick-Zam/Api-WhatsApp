# WhatsApp API SaaS Platform

Comprehensive open-source SaaS platform to automate WhatsApp communication using a production-oriented architecture.

Built with Node.js and Express (backend) plus Next.js and TypeScript (frontend), this project helps teams connect devices, manage sessions, and send WhatsApp messages through a REST API.

## Overview

This platform turns the Baileys engine into a multi-user product with:

- Authentication and account management.
- API key based access for messaging endpoints.
- Dashboard for session operations, chats, logs, and settings.
- Security controls for production usage (JWT, MFA, trusted devices, OAuth, auditing).

Unlike simple bot scripts, this repository is structured for real deployments and long-term maintenance.

## Key Features

- Multi-user architecture: registration and login with JWT.
- RESTful API: consistent HTTP endpoints for messaging and operations.
- Advanced messaging:
	- Text messages.
	- Media messages (images, videos, audio/voice notes, documents).
	- Polls.
	- Location sharing.
	- Contacts (vCards).
	- Presence simulation (typing and recording).
- Real-time QR flow: connect WhatsApp devices from the dashboard.
- Secure authentication model:
	- JWT sessions.
	- MFA and trusted devices.
	- OAuth providers.
	- Protected API routes via x-api-key.
- Logging and audit foundation for operational visibility and compliance.

## High-Level Architecture

```text
Web UI (Next.js)
	 |
	 v
API Layer (Express)
	 |
	 +--> Auth / Security / Audit Services
	 |
	 v
PostgreSQL (users, sessions, audit)
	 |
	 v
WhatsApp Engine (Baileys)
```

## Technology Stack

| Layer | Main Technologies |
|---|---|
| Backend | Node.js 18+, Express 5, PostgreSQL, Baileys, Zod, Pino |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Security | JWT, bcryptjs, helmet, rate limiting, MFA (speakeasy), OAuth |
| Testing | Playwright (E2E smoke tests) |
| Operations | Docker, Docker Compose, Dokploy, Traefik |

## Repository Structure

```text
Api-WhatsApp/
├── Backend/            # Express API + WhatsApp engine
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       └── scripts/
├── frontend/           # Next.js dashboard and landing
│   ├── src/app/
│   ├── src/components/
│   └── e2e/
├── docs/               # Operational and technical documentation
│   ├── README.md
│   ├── ENV_SETUP.md
│   ├── SECRETS_CHECKLIST.md
│   ├── DEPLOY_DOKPLOY.md
│   ├── SMOKE_TEST.md
│   ├── COMPLIANCE.md
│   └── database/schema.sql
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 18 or higher.
- Docker and Docker Compose.
- PostgreSQL (required for persistent production data).

### 1) Backend Setup

```bash
cd Backend
npm install
npm run dev
```

Backend runs on http://localhost:3001

### 2) Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### 3) Optional: Docker Local Stack

```bash
docker compose up -d
```

## Usage Guide

### Connect a Device

1. Open frontend at http://localhost:3000.
2. Login or create an account.
3. Go to dashboard and open the connection section.
4. Scan the QR code from WhatsApp mobile app (Linked Devices).

### Send a Text Message (API)

```bash
curl -X POST http://localhost:3001/messages/text \
	-H "Content-Type: application/json" \
	-H "x-api-key: <your-api-key>" \
	-d '{"phone":"593991234567","message":"Hello from API!"}'
```

### Send a Poll (API)

```bash
curl -X POST http://localhost:3001/messages/poll \
	-H "Content-Type: application/json" \
	-H "x-api-key: <your-api-key>" \
	-d '{
		"phone":"593991234567",
		"name":"Do you like this API?",
		"values":["Yes","No"],
		"singleSelect":true
	}'
```

## Database Setup

For production:

1. Provision PostgreSQL.
2. Execute docs/database/schema.sql.
3. Configure environment variables based on docs/ENV_SETUP.md.

## Current Project Status

- Modal-only auth flow in frontend (?auth=login and ?auth=register).
- MFA and trusted devices implemented.
- Email verification implemented.
- Chats dashboard refactored into reusable components.
- Initial Playwright E2E smoke suite available.

## Documentation

More documentation is available in docs/.

- Docs index: [docs/README.md](docs/README.md)
- Environment setup: [docs/ENV_SETUP.md](docs/ENV_SETUP.md)
- Secrets checklist: [docs/SECRETS_CHECKLIST.md](docs/SECRETS_CHECKLIST.md)
- Dokploy deployment: [docs/DEPLOY_DOKPLOY.md](docs/DEPLOY_DOKPLOY.md)
- Smoke tests: [docs/SMOKE_TEST.md](docs/SMOKE_TEST.md)
- Compliance and audit: [docs/COMPLIANCE.md](docs/COMPLIANCE.md)
- Database schema: [docs/database/schema.sql](docs/database/schema.sql)

## Disclaimer

This project uses Baileys, an unofficial WhatsApp integration approach.

- Use responsibly and avoid spam or abusive automation.
- WhatsApp may restrict or ban accounts that violate their Terms of Service.
- For enterprise-critical notifications, evaluate the official WhatsApp Cloud API.

## License

MIT License
