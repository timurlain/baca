# Testing Guide

## Running Tests

```bash
# Backend unit tests
cd backend
dotnet test --filter "FullyQualifiedName~Baca.Api.Tests" --verbosity normal

# Backend integration tests (requires Docker for PostgreSQL)
cd backend
dotnet test --filter "FullyQualifiedName~Baca.Api.IntegrationTests" --verbosity normal

# All backend tests
cd backend
dotnet test --verbosity normal

# Backend with coverage
cd backend
dotnet test --collect:"XPlat Code Coverage"

# Frontend unit/component tests
cd frontend
npm run test

# Frontend with coverage
cd frontend
npx vitest run --coverage

# E2E tests (requires backend running on :5000)
cd frontend
npm run test:e2e
```

## Test Architecture

### Backend (xUnit)

| Layer | Location | Dependencies | Purpose |
|-------|----------|-------------|---------|
| Unit | `Baca.Api.Tests/` | Moq, in-memory | Service logic, auth, parsing |
| Integration | `Baca.Api.IntegrationTests/` | Testcontainers PostgreSQL, WebApplicationFactory | Full HTTP pipeline, DB, auth middleware |

**Integration test auth:** Tests use `X-Test-User-Id` and `X-Test-Role` headers via `AuthMiddleware` test mode (enabled in Development environment).

### Frontend (Vitest + React Testing Library)

| Layer | Location | Purpose |
|-------|----------|---------|
| Component | `src/components/**/*.test.tsx` | Render, user interaction, state |
| Hook | `src/hooks/*.test.ts` | Custom hook behavior |
| API client | `src/api/client.test.ts` | HTTP calls, error handling |
| Shared | `src/test/components/*.test.tsx` | Layout components |

**MSW:** API mocks via `msw` in `src/mocks/handlers.ts` and `src/mocks/server.ts`.

### E2E (Playwright)

| Spec | Scope |
|------|-------|
| `e2e/auth.spec.ts` | Login, guest PIN, logout |
| `e2e/board.spec.ts` | CRUD, drag-drop, assign |
| `e2e/focus.spec.ts` | Priority, status buttons |
| `e2e/voice.spec.ts` | Recording UI, FAB |
| `e2e/admin.spec.ts` | User/category management |
| `e2e/mobile.spec.ts` | Responsive layout, tab bar |

## Coverage Targets

| Area | Target | Current |
|------|--------|---------|
| Backend lines | 80% | ~87% |
| Frontend lines | 70% | ~87% |

## Adding New Tests

**Backend unit test pattern:**
```csharp
public class MyServiceTests
{
    private readonly Mock<IBacaDbContext> _dbMock = new();

    [Fact]
    public async Task MethodName_Scenario_ExpectedResult()
    {
        // Arrange
        // Act
        // Assert
    }
}
```

**Backend integration test pattern:**
```csharp
public class MyEndpointTests(BacaWebApplicationFactory factory)
    : IClassFixture<BacaWebApplicationFactory>
{
    [Fact]
    public async Task Endpoint_Scenario_ReturnsExpected()
    {
        var client = factory.CreateAuthenticatedClient("admin");
        var response = await client.GetAsync("/api/endpoint");
        response.EnsureSuccessStatusCode();
    }
}
```

**Frontend component test pattern:**
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));

describe('Component', () => {
  it('renders correctly', () => {
    render(<MemoryRouter><Component /></MemoryRouter>);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

## CI Pipeline

GitHub Actions (`ci.yml`) runs three jobs:

1. **Backend Build & Test** — `dotnet build --warnaserror` + unit + integration tests
2. **Frontend Build & Test** — `eslint` + `tsc -b` + `vite build` + vitest
3. **E2E Tests** — Playwright with live backend (depends on 1 & 2)
