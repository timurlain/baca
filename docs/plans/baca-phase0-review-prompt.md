# Phase 0 Review Agent — paste into a fresh Claude Code session

## Install skills first:

```
/tissaia install inquisitor
/tissaia install tinkerer-baca
```

## Then paste this prompt:

```
You are the Phase 0 Review Agent for the Bača project. Your ONLY job is to 
audit the foundation skeleton created in Phase 0 against the project blueprint. 
You do NOT implement anything. You find problems and report them.

Use the inquisitor skill as your methodology — examine evidence, substantiate 
findings, classify severity, deliver a verdict.

Read BLUEPRINT.md first — it's the source of truth.

Then systematically verify every item below. For each check, report:
- ✅ PASS (with brief evidence)
- ❌ FAIL (with exact issue and location)
- ⚠️ PARTIAL (what's missing)

---

## CHECK 1: Compiler Strictness

- [ ] backend/Directory.Build.props exists
- [ ] Contains <Nullable>enable</Nullable>
- [ ] Contains <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
- [ ] Contains <WarningLevel>9999</WarningLevel>
- [ ] Contains <AnalysisLevel>latest-recommended</AnalysisLevel>
- [ ] Run `cd backend && dotnet build --warnaserror` — ZERO warnings

## CHECK 2: Solution Structure

- [ ] backend/Baca.Api.sln exists and references all 3 projects
- [ ] backend/Baca.Api/Baca.Api.csproj exists
- [ ] backend/Baca.Api.Tests/Baca.Api.Tests.csproj exists
- [ ] backend/Baca.Api.IntegrationTests/Baca.Api.IntegrationTests.csproj exists
- [ ] All NuGet packages from the blueprint are referenced:
      - Npgsql.EntityFrameworkCore.PostgreSQL
      - Microsoft.AspNetCore.Authentication.JwtBearer
      - Microsoft.CognitiveServices.Speech
      - Anthropic.SDK
      - Twilio
      - BCrypt.Net-Next
      - (Tests): xunit, NSubstitute, FluentAssertions, Bogus, coverlet.collector
      - (IntegrationTests): Microsoft.AspNetCore.Mvc.Testing, Testcontainers.PostgreSql

## CHECK 3: EF Core Models

For EACH model, verify ALL fields from the blueprint's Data Model section:

### User
- [ ] Id (int, PK)
- [ ] Name (required string)
- [ ] Email (nullable string)
- [ ] Phone (nullable string)
- [ ] Role (UserRole enum)
- [ ] AvatarColor (string, default value)
- [ ] CreatedAt (DateTime)
- [ ] IsActive (bool, default true)
- [ ] Nullable annotations correct (required vs ?, = null!, = [])

### TaskItem (NOT Task!)
- [ ] Class is named TaskItem, not Task
- [ ] Id, Title (required), Description (?), Status (enum), Priority (enum)
- [ ] CategoryId (int?), AssigneeId (int?), ParentTaskId (int?)
- [ ] DueDate (DateTime?), SortOrder (int)
- [ ] CreatedById (int, required FK)
- [ ] CreatedAt, UpdatedAt (DateTime)
- [ ] Navigation properties: Category?, Assignee?, ParentTask?, CreatedBy (null!)
- [ ] Collections: Subtasks = [], Comments = []
- [ ] All null! usages have "// EF Core populates" comment

### Comment
- [ ] Id, TaskId (int), AuthorId (int), Text (required string), CreatedAt

### Category
- [ ] Id, Name (required), Color (string), SortOrder (int), CreatedAt

### LoginToken
- [ ] Id, UserId (int), Token (string), ExpiresAt, IsUsed, CreatedAt

### AppSettings
- [ ] Id, GuestPin (string), AppName (string, default "Bača")

### Enums
- [ ] TaskItemStatus: Idea, Open, InProgress, ForReview, Done
- [ ] Priority: Low, Medium, High
- [ ] UserRole: Admin, User, Guest

## CHECK 4: BacaDbContext

- [ ] All DbSets present (Users, TaskItems, Comments, Categories, LoginTokens, AppSettings)
- [ ] OnModelCreating configures relationships (not data annotations)
- [ ] Index on TaskItem.Status
- [ ] Index on TaskItem.AssigneeId
- [ ] Index on TaskItem.ParentTaskId
- [ ] Cascade delete: TaskItem → Subtasks → Comments
- [ ] Category.Name unique constraint (or will be)

## CHECK 5: Migration

- [ ] At least one migration exists in Data/Migrations/
- [ ] `dotnet ef migrations list` succeeds (no errors)

## CHECK 6: DTOs — verify ALL from blueprint exist

Count them. The blueprint specifies these (minimum 15+):
- [ ] TaskDto, TaskDetailDto
- [ ] CreateTaskRequest, UpdateTaskRequest
- [ ] StatusChangeRequest, SortChangeRequest
- [ ] CommentDto, CreateCommentRequest
- [ ] CategoryDto, CreateCategoryRequest, UpdateCategoryRequest
- [ ] UserDto, CreateUserRequest, UpdateUserRequest
- [ ] LoginRequest, GuestLoginRequest, AuthResponse
- [ ] VoiceParseResponse (with confidence fields!)
- [ ] DashboardDto (stats, per-category progress)
- [ ] FocusTaskDto
- [ ] HealthResponse
- [ ] AppSettingsDto, UpdateSettingsRequest

For each DTO, verify:
- [ ] Fields match the blueprint
- [ ] Uses `required` for mandatory fields
- [ ] Uses `?` for optional fields
- [ ] No bare uninitialized strings

## CHECK 7: Service Interfaces

- [ ] IAuthService (methods for token generation, verification, guest PIN)
- [ ] IEmailService (send magic link)
- [ ] IDashboardService (get stats)
- [ ] IVoiceTranscriptionService (transcribe audio)
- [ ] IVoiceParsingService (parse transcription to task)
- [ ] IWhatsAppNotificationService (notify on assignment)
- [ ] All return types use DTOs, not entities
- [ ] All methods are async with CancellationToken

## CHECK 8: Endpoint Stubs

For EACH endpoint file, verify routes match the blueprint API section:

### AuthEndpoints
- [ ] POST /api/auth/request-link
- [ ] GET /api/auth/verify/{token}
- [ ] POST /api/auth/guest
- [ ] POST /api/auth/logout
- [ ] GET /api/auth/me

### TaskEndpoints
- [ ] GET /api/tasks (with filter params)
- [ ] GET /api/tasks/{id}
- [ ] POST /api/tasks
- [ ] PUT /api/tasks/{id}
- [ ] PATCH /api/tasks/{id}/status
- [ ] PATCH /api/tasks/{id}/sort
- [ ] PATCH /api/tasks/{id}/assign-me
- [ ] DELETE /api/tasks/{id}

### FocusEndpoints
- [ ] GET /api/focus

### CommentEndpoints
- [ ] GET /api/tasks/{id}/comments
- [ ] POST /api/tasks/{id}/comments

### CategoryEndpoints
- [ ] GET /api/categories
- [ ] POST /api/categories
- [ ] PUT /api/categories/{id}
- [ ] DELETE /api/categories/{id}

### UserEndpoints
- [ ] GET /api/users
- [ ] POST /api/users
- [ ] PUT /api/users/{id}
- [ ] POST /api/users/{id}/resend-link

### DashboardEndpoints
- [ ] GET /api/dashboard

### VoiceEndpoints
- [ ] POST /api/voice/transcribe
- [ ] POST /api/voice/parse

### SettingsEndpoints
- [ ] GET /api/settings
- [ ] PUT /api/settings

### HealthEndpoints
- [ ] GET /api/health — FULLY IMPLEMENTED (not stub)

### All stubs
- [ ] Return 501 Not Implemented (not 200, not throw)
- [ ] Have correct HTTP method
- [ ] Have correct route parameters and types

## CHECK 9: Program.cs

- [ ] All services registered in DI (even as NotImplementedException placeholders)
- [ ] EF Core + Npgsql configured
- [ ] CORS configured
- [ ] All endpoint groups mapped (MapAuthEndpoints, MapTaskEndpoints, etc.)
- [ ] Seed data logic present (admin user, default categories, guest PIN)
- [ ] AuthMiddleware registered

## CHECK 10: Frontend — Types Contract

Open src/types/index.ts and cross-reference EVERY type against the C# DTOs:

- [ ] All DTOs have TypeScript equivalents
- [ ] Field names are camelCase (matching JSON serialization)
- [ ] Field types are correct (number for int, string for string, string|null 
      or optional for nullable)
- [ ] All enums present (TaskStatus, Priority, UserRole)
- [ ] VoiceParseResponse has confidence fields

## CHECK 11: Frontend — API Client

Open src/api/client.ts and verify:

- [ ] Base URL from env var (VITE_API_URL)
- [ ] Credentials: 'include' (for cookies)
- [ ] Generic get/post/put/patch/delete methods
- [ ] 401 → redirect to /login
- [ ] Typed functions exist for EVERY endpoint from CHECK 8
      (e.g., getTasks, createTask, changeTaskStatus, getFocus, 
       requestMagicLink, verifyToken, guestLogin, etc.)

## CHECK 12: Frontend — Routes

Open src/App.tsx and verify all routes from blueprint:

- [ ] /login
- [ ] / (responsive: mobile → Focus, desktop → Dashboard)
- [ ] /dashboard
- [ ] /board
- [ ] /board/user
- [ ] /voice
- [ ] /guide (and sub-routes)
- [ ] /admin/users
- [ ] /admin/categories
- [ ] /admin/settings
- [ ] Auth guard (redirect to /login if not authenticated)

## CHECK 13: Frontend — Config & Testing Setup

- [ ] vitest.config.ts — jsdom environment, React plugin
- [ ] playwright.config.ts — 3 projects (Desktop Chrome, Pixel 7, iPhone 14)
- [ ] tailwind.config.js — custom colors from blueprint (status colors, 
      forest green header)
- [ ] MSW: src/mocks/handlers.ts — has mock handlers
- [ ] MSW: src/mocks/server.ts — for Vitest
- [ ] MSW: src/mocks/browser.ts — for dev
- [ ] `npm run build` succeeds

## CHECK 14: Infrastructure

- [ ] docker-compose.yml: PostgreSQL service (port 5432, correct env vars)
- [ ] docker-compose.yml: Mailhog service (ports 1025, 8025)
- [ ] .github/workflows/ci.yml exists (at least build steps)
- [ ] .gitignore covers: bin/, obj/, node_modules/, .env, *.db, dist/
- [ ] README.md exists with setup instructions
- [ ] LICENSE file (MIT)

## CHECK 15: Cross-Contract Consistency

This is the MOST IMPORTANT check. The whole point of Phase 0 is that 
contracts are frozen and consistent:

- [ ] Every C# DTO field has a matching TypeScript type field
- [ ] Every API endpoint in C# has a matching function in client.ts
- [ ] Every route in App.tsx matches a page from the blueprint
- [ ] Every enum value is identical in C# and TypeScript
- [ ] HTTP methods match between C# endpoints and TypeScript client
- [ ] Route paths are identical (no typos, no /api/ prefix missing)

Pick 5 random endpoints and trace the full contract:
  C# route → C# request DTO → C# response DTO → TS client function → TS types
Report any mismatches.

---

## DELIVERABLE

After all checks, produce this report:

```
## Phase 0 Review — Bača

**Verdict:** [CLEAN / APPROVED WITH NOTES / CHANGES REQUESTED / BLOCKED]

### Summary
[1-2 sentence overall assessment]

### Results
- Checks passed: X/15
- Checks failed: Y/15
- Checks partial: Z/15

### CRITICAL (must fix before Phase 1)
1. [issue + exact file + what's wrong + what it should be]

### WARNING (should fix, but won't block Phase 1)
1. [issue]

### NOTES (minor, can fix anytime)
1. [observation]

### Contract Consistency Trace
[Results of the 5 random endpoint traces]
```

If the verdict is BLOCKED or CHANGES REQUESTED, list the exact fixes needed.
If CLEAN or APPROVED WITH NOTES, say "Safe to merge and start Phase 1."
```
