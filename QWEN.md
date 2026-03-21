# Eta Flow Space - Project Context

## Project Overview

**Eta Flow Space** is an industrial IoT automation and monitoring platform built on **Node-RED** with a custom **React/TypeScript** frontend. It provides real-time monitoring and control of industrial equipment (boilers, pumps, valves) via Modbus TCP protocol, with data persistence in PostgreSQL.

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   React Frontend    │────▶│   Node-RED Backend   │────▶│   PostgreSQL DB     │
│   (flow-space-ui)   │     │   (flow-space)       │     │   (flow-space-data) │
│   Port: 3000        │◀────│   Port: 1895         │     │   Port: 35432       │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         ▲                           │
         │                           ▼
         │                    ┌──────────────────┐
         │                    │  Modbus Devices  │
         │                    │  (boilers, pumps)│
         └────────────────────┘  (REST API)
```

### Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Node-RED 4.1.3 | Flow-based automation, Modbus integration, REST API |
| **Frontend** | React 19 + TypeScript + Vite | Dashboard UI, data visualization, device control |
| **Database** | PostgreSQL 17 | Time-series device state storage |
| **Communication** | Modbus TCP | Industrial equipment integration |
| **Backup** | Supercronic + pg_dump | Automated database backups |

### Key Features

- **Device Monitoring**: Real-time state tracking for boilers, pumps, and sensors
- **Flow Automation**: Node-RED flows for pump monitoring and boiler automation (Tsarevo, Statum sites)
- **REST API**: JWT-authenticated API for device states, mnemoschemas, and emergency alerts
- **Data Visualization**: React dashboard with DevExtreme components, Leaflet maps, charts
- **Automated Backups**: Daily database backups with 15-day retention
- **Data Cleanup**: Scheduled cleanup and VACUUM operations

## Project Structure

```
eta-flow-space/
├── flow-space/              # Node-RED backend application
│   ├── src/
│   │   ├── routes/          # REST API route handlers
│   │   ├── middleware/      # JWT authorization middleware
│   │   ├── services/        # Business logic services
│   │   ├── orm/             # Sequelize models, migrations, seeders
│   │   └── constants/       # Application constants
│   ├── static/              # Static flow definitions and schemas
│   │   ├── flows/           # Flow-specific data schemas
│   │   └── quick-help/      # Markdown help documentation
│   ├── flows.json           # Node-RED flow definitions
│   ├── settings.js          # Node-RED configuration
│   └── package.json         # Backend dependencies
├── flow-space-ui/           # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client services
│   │   ├── models/          # TypeScript data models
│   │   ├── contexts/        # React contexts
│   │   └── themes/          # UI themes
│   ├── package.json         # Frontend dependencies
│   └── Dockerfile.ui        # Frontend Docker build
├── flow-space-data/         # PostgreSQL data volume (git-ignored)
├── docker-compose.yaml      # Docker orchestration
├── crontab                  # Backup and cleanup schedules
├── cleanup.sh               # Database cleanup script
└── requests.http            # API testing (REST Client)
```

## Building and Running

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Docker Deployment (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Services:**
- **eta-flow-space**: Node-RED backend at `http://localhost:1895`
- **eta-flow-space-ui**: React frontend at `http://localhost:3000`
- **eta-flow-space-database**: PostgreSQL at `localhost:35432`
- **eta-flow-space-database-backup**: Automated backup service

### Local Development

**Backend (Node-RED):**
```bash
cd flow-space
npm install
# Run migrations
npm run migrate
# Start Node-RED
node-red --userDir .
```

**Frontend:**
```bash
cd flow-space-ui
npm install
npm run dev
```

### Database Commands

```bash
# Run migrations
npm run migrate

# Undo all migrations
npm run migrate-undo

# Run seeders
npm run seed

# Undo all seeders
npm run seed-undo
```

## API Endpoints

All API endpoints (except `/health-check` and `/sign-in`) require JWT authentication via `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sign-in` | Authenticate and get JWT token |
| `GET` | `/health-check` | Health check endpoint |
| `GET` | `/api/flows` | List all flows |
| `GET` | `/api/devices` | List all devices |
| `GET` | `/api/devices/:deviceId` | Get device details |
| `GET` | `/api/states/device/:deviceId` | Get current device state |
| `GET` | `/api/states/device/:deviceId/dates` | Get device states by date range |
| `POST` | `/api/states/device/:deviceId` | Update device state |
| `GET` | `/api/mnemoschemas/device/:deviceId` | Get device mnemoschema |
| `GET` | `/api/data-schemas/device/:deviceId` | Get device data schema |
| `GET` | `/api/quick-helps/:referenceKey` | Get quick help documentation |
| `GET` | `/api/states/emergency` | Get all emergency states |
| `GET` | `/api/states/emergency/device/:deviceId` | Get device emergency states |

See `requests.http` for example API requests.

## Authentication

- **JWT Secret**: Configured in `settings.js` and `flow-space-ui/.env`
- **Token Expiry**: 1 year
- **Middleware**: `src/middleware/authorize.js`

## Database Schema

**Main Tables:**
- `Device` - Device definitions (boilers, pumps, sensors)
- `DeviceState` - Time-series device state data
- `EmergencyState` - Emergency/alert records
- `Flow` - Flow definitions
- `User` - User accounts
- `UserDeviceLink` - User-device access permissions

## Development Conventions

### Backend (Node-RED)
- Routes are modularized in `src/routes/`
- Services handle business logic
- Sequelize ORM for database operations
- Global context for sharing routes/services between flows

### Frontend (React)
- TypeScript for type safety
- Vite for bundling
- DevExtreme UI components
- React Router for navigation
- Axios for API calls
- SCSS for styling

### Code Style
- ESLint configured for both projects
- TypeScript strict mode enabled
- Functional components with hooks (React)

## Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yaml` | Service orchestration |
| `flow-space/settings.js` | Node-RED runtime config |
| `flow-space/.config.runtime.json` | Instance ID, telemetry settings |
| `flow-space/.config.users.json` | User credentials |
| `flow-space/flows.json` | Flow definitions |
| `flow-space/src/orm/database.config.json` | Database connection |
| `flow-space-ui/tsconfig.json` | TypeScript config |
| `flow-space-ui/vite.config.ts` | Vite bundler config |

## Common Issues

### Permission Errors
If you see `EACCES: permission denied` for the data directory:
```bash
sudo chown -R 1000:1000 ./flow-space
sudo chown -R 1000:1000 ./flow-space-data
```

Node-RED runs as user `node-red` (UID 1000) inside the container.

## Environment Variables

**Backend:**
- `NODE_ENV`: `production` or `development`
- `JWT_SECRET`: JWT signing secret

**Database:**
- `POSTGRES_USER`: `postgres`
- `POSTGRES_PASSWORD`: `0987654321`
- `POSTGRES_DB`: `eta_flow_space_database`

## Testing

Use `requests.http` with the REST Client extension (VS Code) or similar tools for API testing.
