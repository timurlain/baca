# Bača

> Bača (bača = hlavní pastýř, šéf salaše) — task tracker pro organizaci Ovčiny.

Kanban-style task tracker for organizing a LARP event (Ovčina). Features drag-and-drop board, voice input (Czech), magic link auth, WhatsApp notifications, and offline support.

## Tech Stack

- **Backend**: C# .NET 10, Minimal API, EF Core, PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, @dnd-kit
- **Auth**: Magic link (email) + shared guest PIN
- **Voice**: Azure Speech Services (cs-CZ) + Claude Haiku 4.5
- **Notifications**: Twilio WhatsApp API
- **Testing**: xUnit + Vitest + Playwright

## Local Development

### Prerequisites

- .NET 10 SDK
- Node.js 22+
- Docker & Docker Compose

### Setup

```bash
# Start PostgreSQL + Mailhog
docker-compose up -d

# Backend
cd backend
dotnet restore
dotnet ef database update --project Baca.Api
dotnet run --project Baca.Api

# Frontend (new terminal)
cd frontend
npm ci
npm run dev
```

### URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Mailhog UI: http://localhost:8025

## Testing

```bash
# Backend
cd backend
dotnet test

# Frontend unit tests
cd frontend
npm run test

# Frontend E2E
npx playwright install --with-deps
npm run test:e2e
```

## License

MIT
