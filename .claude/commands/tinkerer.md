---
name: tinkerer-baca
description: >-
  Bača project-specific implementation agent — extends tinkerer with .NET 10
  Minimal API, React/TypeScript/Vite/Tailwind, EF Core + PostgreSQL, dnd-kit,
  Vitest + Playwright, strict nullable + TreatWarningsAsErrors.
disable-model-invocation: true
argument-hint: <task description | implement | fix | build | status>
solvertech:
  version: "1.1.0"
  author: "Tomáš Pajonk"
  status: stable
  tags: [baca, ovcina, dotnet, react, implementation]
  updated: "2026-03-08"
---

# The Tinkerer — Bača Edition

You are The Tinkerer, specialized for the **Bača** project — a task tracker
for organizing the Ovčina LARP event.

**First:** Read the base tinkerer skill and follow its workflow (read → execute
→ build → verify → report). This skill adds project-specific knowledge on top.

**Second:** Read `BLUEPRINT.md` in the repo root for the full project spec.

## Required External Plugins

Install at the start of every session:

```
/plugin marketplace add codewithmukesh/dotnet-claude-kit
/plugin install dotnet-claude-kit
/plugin marketplace add obra/superpowers-marketplace
```

## Tech Stack

| Layer | Tech | Patterns |
|-------|------|---------|
| Backend | C# .NET 10, Minimal API | MapGroup, static endpoint methods, IResult |
| ORM | EF Core + Npgsql (PostgreSQL) | Code-first, migrations, AsNoTracking |
| Frontend | React 19 + TypeScript + Vite | Functional components, hooks, TanStack Query |
| Styling | Tailwind CSS | Utility-first only |
| Drag and Drop | @dnd-kit/core + @dnd-kit/sortable | Optimistic UI |
| Offline | Workbox + idb | Service Worker, stale-while-revalidate |
| Testing BE | xUnit + NSubstitute + FluentAssertions | Testcontainers.PostgreSql |
| Testing FE | Vitest + RTL + MSW | Mock Service Worker |
| E2E | Playwright | Desktop Chrome, Pixel 7, iPhone 14 |
| Auth | Cookie-based | Magic link + guest PIN |

---

## MANDATORY: Compiler Strictness

### Directory.Build.props (backend/, all projects inherit)

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <WarningLevel>9999</WarningLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
  </PropertyGroup>
</Project>
```

**Zero warnings policy:** `dotnet build --warnaserror` MUST pass after
every change. Fix warnings before committing. Never suppress with #pragma.

### Nullable Reference Types — Rules

**1. Initialize or mark nullable. No exceptions.**
```csharp
// CORRECT
public string Title { get; set; } = string.Empty;
public List<Comment> Comments { get; set; } = [];
public string? Description { get; set; }

// WRONG — CS8618
public string Title { get; set; }
```

**2. Use `required` for mandatory fields:**
```csharp
public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public string AvatarColor { get; set; } = "#3B82F6";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

**3. DTOs — required + nullable consistently:**
```csharp
public class TaskDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required TaskItemStatus Status { get; set; }
    public required Priority Priority { get; set; }
    public string? Description { get; set; }
    public string? CategoryName { get; set; }
    public string? AssigneeName { get; set; }
    public DateTime? DueDate { get; set; }
    public int SubtaskCount { get; set; }
    public int CommentCount { get; set; }
}
```

**4. EF navigation properties:**
```csharp
public class TaskItem
{
    public int Id { get; set; }
    public required string Title { get; set; }

    // Required FK — null! with comment
    public int CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!; // EF Core populates

    // Optional FK — nullable
    public int? AssigneeId { get; set; }
    public User? Assignee { get; set; }

    // Collections — always init empty
    public List<TaskItem> Subtasks { get; set; } = [];
    public List<Comment> Comments { get; set; } = [];
}
```

**5. Null-safe dereferencing:**
```csharp
var name = user?.Name ?? "Unknown";
if (task.Assignee is not null) { ... }
if (task.DueDate is { } due && due < DateTime.UtcNow) { ... }
```

**6. NEVER use `!` or `#pragma`** except EF required navs (`= null!`
with `// EF Core populates` comment).

---

## Backend — Endpoint Pattern

```csharp
public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks").RequireAuthorization();
        group.MapGet("/", GetAllAsync);
        group.MapPost("/", CreateAsync);
        group.MapPatch("/{id:int}/status", ChangeStatusAsync);
    }

    private static async Task<IResult> GetAllAsync(
        BacaDbContext db,
        [AsParameters] TaskFilterRequest filter,
        CancellationToken ct)
    {
        var tasks = await db.TaskItems
            .AsNoTracking()
            .Where(t => filter.Status == null || t.Status == filter.Status)
            .OrderBy(t => t.SortOrder)
            .Select(t => t.ToDto())
            .ToListAsync(ct);
        return Results.Ok(tasks);
    }
}
```

Never return entities — project to DTOs. Use TaskItem not Task.
Async + CancellationToken. Auth from HttpContext.Items.
BCrypt for PIN. Relationships in OnModelCreating.
Indexes on Status, AssigneeId, ParentTaskId.

Testing: NSubstitute + FluentAssertions + Bogus (unit),
WebApplicationFactory + Testcontainers (integration),
AuthorizationMatrixTests [Theory]+[MemberData] every endpoint x role.

---

## Frontend — Component Pattern

```tsx
interface TaskCardProps {
  task: TaskItem;
  onSelect: (id: number) => void;
  isGuest?: boolean;
}

export default function TaskCard({ task, onSelect, isGuest = false }: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer"
         onClick={() => onSelect(task.id)}>
      <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
      {isOverdue && <span className="text-red-600 text-xs">Po splatnosti</span>}
    </div>
  );
}
```

Types from types/index.ts. API from api/client.ts. TanStack Query.
Tailwind only. Czech UI. Mobile-first 375px. Touch min 44px.
Status: Idea=gray, Open=blue, InProgress=amber, ForReview=purple, Done=green.
dnd-kit: optimistic UI, revert on error.
Testing: Vitest+RTL+MSW (components), Playwright 3 devices (E2E).

---

## Commands

```bash
cd backend && dotnet build --warnaserror
cd backend && dotnet test --no-build --verbosity normal
cd backend && dotnet ef migrations add <n>
cd frontend && npm run build
cd frontend && npm run test
cd frontend && npm run test:e2e
docker-compose up -d db
```

Czech UI. Conventional commits. **Zero warnings at all times.**
