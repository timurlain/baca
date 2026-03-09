# Task Creation Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add text-based task creation — single task form + bulk AI import from pasted text/tables.

**Architecture:** Extract a shared `TaskForm` from `VoiceTaskPreview`, create a new `/tasks/new` page with two tabs (single + bulk), add a backend `POST /api/tasks/parse-bulk` endpoint that reuses the voice parsing service for multi-task text parsing, and wire "+" buttons into the board UI.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, .NET 10 Minimal API, Claude Haiku 4.5 (Anthropic API)

---

### Task 1: Extract shared TaskForm component from VoiceTaskPreview

**Files:**
- Create: `frontend/src/components/shared/TaskForm.tsx`
- Modify: `frontend/src/components/voice/VoiceTaskPreview.tsx`

**Context:**
`VoiceTaskPreview.tsx` (lines 29-213) contains a full task editing form with fields: title, assignee, category, priority, status, due date, description. It also has voice-specific UI (transcription box, confidence indicators, retry/cancel buttons). We need to extract just the form fields into a reusable component.

**Step 1: Create the shared TaskForm component**

Create `frontend/src/components/shared/TaskForm.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { users as usersApi, categories as categoriesApi } from '@/api/client';
import { Priority, TaskStatus } from '@/types';
import type { User, Category, CreateTaskRequest } from '@/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/utils/constants';

export interface TaskFormValues {
  title: string;
  description: string;
  assigneeId: number | null;
  categoryId: number | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
}

export interface FieldConfidence {
  title?: number | null;
  assignee?: number | null;
  category?: number | null;
  priority?: number | null;
  dueDate?: number | null;
}

interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>;
  confidence?: FieldConfidence;
  onSubmit: (request: CreateTaskRequest) => Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
  idPrefix?: string;
}

function confidenceClass(confidence: number | null | undefined): string {
  if (confidence === null || confidence === undefined || confidence === 0) return 'border-gray-300';
  if (confidence < 0.5) return 'border-red-400 bg-red-50';
  if (confidence < 0.8) return 'border-amber-300 bg-amber-50';
  return 'border-gray-300';
}

function WarningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 inline ml-1">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
}

export default function TaskForm({
  initialValues,
  confidence,
  onSubmit,
  submitLabel = 'Vytvořit úkol',
  submittingLabel = 'Ukládání...',
  idPrefix = 'tf',
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [assigneeId, setAssigneeId] = useState<number | null>(initialValues?.assigneeId ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(initialValues?.categoryId ?? null);
  const [priority, setPriority] = useState<Priority>(initialValues?.priority ?? Priority.Medium);
  const [status, setStatus] = useState<TaskStatus>(initialValues?.status ?? TaskStatus.Idea);
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? '');

  const [userList, setUserList] = useState<User[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.list().then(setUserList).catch(() => {});
    categoriesApi.list().then(setCategoryList).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Název úkolu je povinný');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId: assigneeId ?? undefined,
        categoryId: categoryId ?? undefined,
        priority,
        dueDate: dueDate || undefined,
        status,
      });
      // Reset form after successful save
      setTitle('');
      setDescription('');
      setAssigneeId(null);
      setCategoryId(null);
      setPriority(Priority.Medium);
      setDueDate('');
      // Keep status (user likely wants to add more to same column)
    } catch {
      setError('Nepodařilo se vytvořit úkol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-title`} className="block text-sm font-medium text-gray-700 mb-1">Název</label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Co je potřeba udělat?"
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.title)}`}
          required
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-assignee`} className="block text-sm font-medium text-gray-700 mb-1">
          Přiřazeno
          {confidence?.assignee !== undefined && confidence.assignee !== null && confidence.assignee < 0.5 && <WarningIcon />}
        </label>
        <select
          id={`${idPrefix}-assignee`}
          value={assigneeId ?? ''}
          onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.assignee)}`}
        >
          <option value="">— Nepřiřazeno —</option>
          {userList.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-category`} className="block text-sm font-medium text-gray-700 mb-1">
          Kategorie
          {confidence?.category !== undefined && confidence.category !== null && confidence.category < 0.5 && <WarningIcon />}
        </label>
        <select
          id={`${idPrefix}-category`}
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.category)}`}
        >
          <option value="">— Bez kategorie —</option>
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-priority`} className="block text-sm font-medium text-gray-700 mb-1">
            Priorita
            {confidence?.priority !== undefined && confidence.priority !== null && confidence.priority < 0.5 && <WarningIcon />}
          </label>
          <select
            id={`${idPrefix}-priority`}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.priority)}`}
          >
            {Object.values(Priority).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-status`} className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
          <select
            id={`${idPrefix}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof TaskStatus[keyof typeof TaskStatus])}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
          >
            {Object.values(TaskStatus).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-dueDate`} className="block text-sm font-medium text-gray-700 mb-1">
          Termín
          {confidence?.dueDate !== undefined && confidence.dueDate !== null && confidence.dueDate < 0.5 && <WarningIcon />}
        </label>
        <input
          id={`${idPrefix}-dueDate`}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 ${confidenceClass(confidence?.dueDate)}`}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-desc`} className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
        <textarea
          id={`${idPrefix}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Podrobnosti, poznámky..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-forest-800 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}
```

**Step 2: Refactor VoiceTaskPreview to use TaskForm**

Replace the inline form fields in `VoiceTaskPreview.tsx` with `TaskForm`. Keep the transcription box and retry/cancel buttons. The component wraps `TaskForm` and passes confidence + initial values from the parsed voice response.

Replace `frontend/src/components/voice/VoiceTaskPreview.tsx` with:

```tsx
import { tasks } from '@/api/client';
import { Priority, TaskStatus } from '@/types';
import type { VoiceParseResponse, CreateTaskRequest } from '@/types';
import TaskForm from '@/components/shared/TaskForm';
import type { FieldConfidence } from '@/components/shared/TaskForm';

interface VoiceTaskPreviewProps {
  parsed: VoiceParseResponse;
  onSave: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export default function VoiceTaskPreview({ parsed, onSave, onRetry, onCancel }: VoiceTaskPreviewProps) {
  const confidence: FieldConfidence = {
    title: parsed.title ? 0.9 : 0,
    assignee: parsed.assigneeConfidence,
    category: parsed.categoryConfidence,
    priority: parsed.priorityConfidence,
    dueDate: parsed.dueDateConfidence,
  };

  const handleSubmit = async (req: CreateTaskRequest) => {
    await tasks.create(req);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs text-gray-500 mb-1">Přepis</p>
        <p className="text-sm text-gray-600 italic">{parsed.rawTranscription}</p>
      </div>

      <TaskForm
        initialValues={{
          title: parsed.title ?? '',
          description: parsed.description ?? '',
          assigneeId: parsed.assigneeId ?? null,
          categoryId: parsed.categoryId ?? null,
          priority: parsed.priority ?? Priority.Medium,
          status: parsed.status ?? TaskStatus.Open,
          dueDate: parsed.dueDate?.split('T')[0] ?? '',
        }}
        confidence={confidence}
        onSubmit={handleSubmit}
        submitLabel="Uložit úkol"
        idPrefix="vtp"
      />

      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Zkusit znovu
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Zrušit
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Run frontend build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add frontend/src/components/shared/TaskForm.tsx frontend/src/components/voice/VoiceTaskPreview.tsx
git commit -m "refactor: extract shared TaskForm from VoiceTaskPreview"
```

---

### Task 2: Create the CreateTaskPage with single-task tab

**Files:**
- Create: `frontend/src/components/tasks/CreateTaskPage.tsx`
- Modify: `frontend/src/App.tsx`

**Context:**
This page lives at `/tasks/new`. It reads the `?status=` query param to pre-fill the status dropdown (e.g., when user clicks "+" on the "Otevřeno" column). For now, just the single-task tab — bulk import comes in Task 4.

**Step 1: Create CreateTaskPage**

Create `frontend/src/components/tasks/CreateTaskPage.tsx`:

```tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasks } from '@/api/client';
import { TaskStatus } from '@/types';
import type { CreateTaskRequest, TaskStatus as TaskStatusType } from '@/types';
import TaskForm from '@/components/shared/TaskForm';

type Tab = 'single' | 'bulk';

export default function CreateTaskPage() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status') as TaskStatusType | null;
  const initialStatus = statusParam && Object.values(TaskStatus).includes(statusParam)
    ? statusParam
    : TaskStatus.Idea;

  const [activeTab, setActiveTab] = useState<Tab>('single');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateSingle = async (req: CreateTaskRequest) => {
    await tasks.create(req);
    setSuccessMsg('Úkol vytvořen');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nový úkol</h1>

      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'single' ? 'text-forest-700 border-b-2 border-forest-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('single')}
        >
          Jeden úkol
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'bulk' ? 'text-forest-700 border-b-2 border-forest-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('bulk')}
        >
          Hromadný import
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {activeTab === 'single' && (
        <TaskForm
          initialValues={{ status: initialStatus }}
          onSubmit={handleCreateSingle}
          idPrefix="create"
        />
      )}

      {activeTab === 'bulk' && (
        <div className="text-gray-500 text-sm p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
          Hromadný import — připravuje se...
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add route in App.tsx**

In `frontend/src/App.tsx`, add the import at the top (after the Focus import around line 18):

```tsx
import CreateTaskPage from '@/components/tasks/CreateTaskPage';
```

Add the route inside the `<Routes>` block, after the board routes (after line 109):

```tsx
{/* Task creation (Phase 2) */}
<Route path="/tasks/new" element={<AuthGuard><CreateTaskPage /></AuthGuard>} />
```

**Step 3: Run frontend build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add frontend/src/components/tasks/CreateTaskPage.tsx frontend/src/App.tsx
git commit -m "feat: add CreateTaskPage with single-task form at /tasks/new"
```

---

### Task 3: Add "+" buttons to KanbanBoard and KanbanColumn

**Files:**
- Modify: `frontend/src/components/board/KanbanBoard.tsx`
- Modify: `frontend/src/components/board/KanbanColumn.tsx`

**Context:**
Two entry points: a "+" button in each column header (pre-sets status), and a "+ Nový úkol" button in the board header. Both navigate to `/tasks/new` with appropriate query params. Guest users should not see these buttons.

**Step 1: Add "+" to KanbanColumn header**

In `frontend/src/components/board/KanbanColumn.tsx`, add `useNavigate` import and a `navigate` call:

Add to imports (line 1 area):
```tsx
import { useNavigate } from 'react-router-dom';
```

Add `disabled` prop usage — the "+" button should be hidden when `disabled` is true (guest users). Replace the header div (lines 29-36) with:

```tsx
<div className="flex items-center justify-between px-2 mb-4">
  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
    {STATUS_LABELS[status]}
  </h2>
  <div className="flex items-center gap-1">
    {!disabled && (
      <button
        onClick={() => navigate(`/tasks/new?status=${status}`)}
        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-forest-700 hover:bg-forest-50 transition-colors"
        title="Nový úkol"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
      </button>
    )}
    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
      {tasks.length}
    </span>
  </div>
</div>
```

Add inside the component function (after line 22, before the return):
```tsx
const navigate = useNavigate();
```

**Step 2: Add "+ Nový úkol" button to KanbanBoard header**

In `frontend/src/components/board/KanbanBoard.tsx`, add `useNavigate`:

Add to imports (line 1 area, with react-router-dom if not already imported):
```tsx
import { useNavigate } from 'react-router-dom';
```

Add inside the component (after `const isGuest` on line 39):
```tsx
const navigate = useNavigate();
```

Replace the header div (lines 87-89) with:
```tsx
<div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
  {!isGuest && (
    <button
      onClick={() => navigate('/tasks/new')}
      className="inline-flex items-center gap-2 bg-forest-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-700 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
      </svg>
      Nový úkol
    </button>
  )}
</div>
```

**Step 3: Run frontend build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add frontend/src/components/board/KanbanBoard.tsx frontend/src/components/board/KanbanColumn.tsx
git commit -m "feat: add + buttons to board header and column headers"
```

---

### Task 4: Backend — bulk parsing endpoint

**Files:**
- Create: `backend/Baca.Api/DTOs/BulkParseDtos.cs`
- Modify: `backend/Baca.Api/Services/IVoiceParsingService.cs`
- Modify: `backend/Baca.Api/Services/VoiceParsingService.cs`
- Modify: `backend/Baca.Api/Endpoints/VoiceEndpoints.cs`

**Context:**
Add `POST /api/tasks/parse-bulk` that accepts `{ text: string }` and returns `{ tasks: VoiceParseResponse[] }`. Reuse the existing `VoiceParsingService` infrastructure — same Anthropic API call, same user/category lookup, same fuzzy matching. The key difference is the system prompt instructs Claude to return an **array** of tasks, and `MaxTokens` is higher.

**Step 1: Create BulkParseDtos**

Create `backend/Baca.Api/DTOs/BulkParseDtos.cs`:

```csharp
namespace Baca.Api.DTOs;

public class BulkParseRequest
{
    public required string Text { get; set; }
}

public class BulkParseResponse
{
    public List<VoiceParseResponse> Tasks { get; set; } = [];
}
```

**Step 2: Add ParseBulkAsync to IVoiceParsingService**

In `backend/Baca.Api/Services/IVoiceParsingService.cs`, add the new method:

```csharp
using Baca.Api.DTOs;

namespace Baca.Api.Services;

public interface IVoiceParsingService
{
    Task<VoiceParseResponse> ParseTranscriptionAsync(string transcription, CancellationToken ct = default);
    Task<BulkParseResponse> ParseBulkTextAsync(string text, CancellationToken ct = default);
}
```

**Step 3: Implement ParseBulkTextAsync in VoiceParsingService**

Add a new constant for the bulk system prompt after line 53 (after the existing `SystemPrompt`):

```csharp
private const string BulkSystemPrompt =
    """
    Jsi asistent pro parsování textově zadaných úkolů v českém jazyce.
    Dostaneš text — může to být tabulka (kopírovaná z Excelu/Google Sheets),
    seznam s odrážkami, poznámky z porady, nebo volný text.
    Tvým úkolem je extrahovat VŠECHNY úkoly do strukturovaného pole.

    Pravidla (stejná jako pro jednotlivé úkoly):
    - Title: stručný, akční popis úkolu (max 100 znaků). Odstraň zbytečná slova.
    - Assignee: porovnej jméno s existujícími uživateli. Fuzzy match.
    - Category: porovnej s existujícími kategoriemi.
    - Priority: "urgentní/důležité/asap/hned" → High, "když bude čas/někdy" → Low, jinak Medium.
    - DueDate: relativní výrazy převeď na ISO datum.
    - Status: vždy "Open" pokud není řečeno jinak.
    - Description: cokoliv navíc co se nevešlo do title.

    Pro každé pole vrať confidence (0.0–1.0):
    - 1.0 = explicitně řečeno
    - 0.7–0.9 = odvozeno s vysokou jistotou
    - 0.3–0.6 = hádání, fuzzy match
    - 0.0 = nebylo zmíněno, default hodnota

    Odpověz POUZE validním JSON pole (array) objektů, bez dalšího textu.
    Příklad: [{"title":"...", ...}, {"title":"...", ...}]
    """;
```

Add the implementation method in `VoiceParsingService`:

```csharp
public async Task<BulkParseResponse> ParseBulkTextAsync(string text, CancellationToken ct = default)
{
    var activeUsers = await dbContext.Users
        .AsNoTracking()
        .Where(user => user.IsActive)
        .OrderBy(user => user.Name)
        .Select(user => new LookupItem(user.Id, user.Name))
        .ToListAsync(ct);

    var categories = await dbContext.Categories
        .AsNoTracking()
        .OrderBy(category => category.SortOrder)
        .ThenBy(category => category.Name)
        .Select(category => new LookupItem(category.Id, category.Name))
        .ToListAsync(ct);

    var payload = new AnthropicRequest(
        Model: configuration["Anthropic:Model"] ?? configuration["Anthropic__Model"] ?? "claude-3-5-haiku-latest",
        MaxTokens: 4000,
        System: BulkSystemPrompt,
        Messages:
        [
            new AnthropicMessage(
                "user",
                BuildBulkUserPrompt(text, activeUsers, categories))
        ]);

    var apiKey = configuration["Anthropic:ApiKey"]
        ?? configuration["Anthropic__ApiKey"]
        ?? throw new InvalidOperationException("Anthropic API key is not configured.");

    using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
    {
        Content = JsonContent.Create(payload, options: SerializerOptions)
    };
    request.Headers.Add("x-api-key", apiKey);
    request.Headers.Add("anthropic-version", AnthropicVersion);

    using var response = await httpClient.SendAsync(request, ct);
    if (!response.IsSuccessStatusCode)
    {
        var errorBody = await response.Content.ReadAsStringAsync(ct);
        throw new InvalidOperationException(
            $"Anthropic API call failed with status {(int)response.StatusCode}: {errorBody}");
    }

    var responsePayload = await response.Content.ReadFromJsonAsync<AnthropicResponse>(SerializerOptions, ct);
    var textPayload = responsePayload?.Content
        .FirstOrDefault(block => string.Equals(block.Type, "text", StringComparison.OrdinalIgnoreCase))
        ?.Text;

    if (string.IsNullOrWhiteSpace(textPayload))
    {
        return new BulkParseResponse();
    }

    var parsedTasks = TryParseBulkResponse(textPayload, text);

    foreach (var task in parsedTasks)
    {
        ApplyLookupMatch(
            task.AssigneeName,
            activeUsers,
            static (responseData, match) =>
            {
                responseData.AssigneeId = match?.Id;
                responseData.AssigneeConfidence = match is null
                    ? Math.Min(responseData.AssigneeConfidence ?? 0.3, 0.3)
                    : Math.Max(responseData.AssigneeConfidence ?? 0, match.Confidence);
            },
            task);

        ApplyLookupMatch(
            task.CategoryName,
            categories,
            static (responseData, match) =>
            {
                responseData.CategoryId = match?.Id;
                responseData.CategoryConfidence = match is null
                    ? Math.Min(responseData.CategoryConfidence ?? 0.3, 0.3)
                    : Math.Max(responseData.CategoryConfidence ?? 0, match.Confidence);
            },
            task);

        task.RawTranscription = text;
        task.Status = task.Status == 0 ? TaskItemStatus.Open : task.Status;
        task.Title = task.Title?.Trim();
        if (task.Title?.Length > 100)
        {
            task.Title = task.Title[..100];
        }
    }

    return new BulkParseResponse { Tasks = parsedTasks };
}

private string BuildBulkUserPrompt(
    string text,
    IReadOnlyList<LookupItem> users,
    IReadOnlyList<LookupItem> categories)
{
    var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    return
        $$"""
          Dnešní datum: {{today}}

          Existující uživatelé:
          {{JsonSerializer.Serialize(users, SerializerOptions)}}

          Existující kategorie:
          {{JsonSerializer.Serialize(categories, SerializerOptions)}}

          Text ke zpracování:
          "{{text}}"
          """;
}

private static List<VoiceParseResponse> TryParseBulkResponse(string textPayload, string originalText)
{
    var normalizedPayload = ExtractJson(textPayload);

    // Try parsing as array first
    try
    {
        var rawItems = JsonSerializer.Deserialize<List<RawVoiceParseResponse>>(normalizedPayload, SerializerOptions);
        if (rawItems is not null)
        {
            return rawItems.Select(raw => new VoiceParseResponse
            {
                Title = raw.Title,
                Description = raw.Description,
                AssigneeName = raw.AssigneeName,
                AssigneeConfidence = raw.AssigneeConfidence,
                CategoryName = raw.CategoryName,
                CategoryConfidence = raw.CategoryConfidence,
                Priority = ParsePriority(raw.Priority),
                PriorityConfidence = raw.PriorityConfidence,
                DueDate = raw.DueDate,
                DueDateConfidence = raw.DueDateConfidence,
                Status = ParseStatus(raw.Status),
                RawTranscription = originalText
            }).ToList();
        }
    }
    catch (JsonException)
    {
        // Fall through to single-object attempt
    }

    // Fallback: try parsing as single object (Claude returned one task)
    var single = TryParseResponse(normalizedPayload, originalText);
    return single.Title is not null ? [single] : [];
}
```

Note: `ExtractJson` needs a small update to also handle arrays. The current implementation checks for `{` and `}`. Update it to also handle `[` and `]`:

Replace the `ExtractJson` method (lines 313-327):

```csharp
private static string ExtractJson(string textPayload)
{
    var trimmedPayload = textPayload.Trim();
    if (trimmedPayload.StartsWith("```", StringComparison.Ordinal))
    {
        var firstBracket = trimmedPayload.IndexOfAny(['{', '[']);
        var lastBracket = Math.Max(trimmedPayload.LastIndexOf('}'), trimmedPayload.LastIndexOf(']'));
        if (firstBracket >= 0 && lastBracket > firstBracket)
        {
            return trimmedPayload[firstBracket..(lastBracket + 1)];
        }
    }

    return trimmedPayload;
}
```

**Step 4: Add the endpoint**

In `backend/Baca.Api/Endpoints/VoiceEndpoints.cs`, add the new endpoint in `MapVoiceEndpoints` (after line 14):

```csharp
group.MapPost("/parse-bulk", ParseBulkAsync);
```

Add the handler method:

```csharp
private static async Task<IResult> ParseBulkAsync(
    HttpContext httpContext,
    IVoiceParsingService voiceParsingService,
    BulkParseRequest request,
    CancellationToken ct)
{
    if (!EndpointIdentity.IsMember(httpContext))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    if (string.IsNullOrWhiteSpace(request.Text))
    {
        return Results.BadRequest("Text is required.");
    }

    var response = await voiceParsingService.ParseBulkTextAsync(request.Text.Trim(), ct);
    return TypedResults.Ok(response);
}
```

**Step 5: Build backend**

Run: `cd backend && dotnet build --warnaserror`
Expected: Build succeeds with zero warnings.

**Step 6: Commit**

```bash
git add backend/Baca.Api/DTOs/BulkParseDtos.cs backend/Baca.Api/Services/IVoiceParsingService.cs backend/Baca.Api/Services/VoiceParsingService.cs backend/Baca.Api/Endpoints/VoiceEndpoints.cs
git commit -m "feat: add POST /api/voice/parse-bulk for AI-powered bulk text parsing"
```

---

### Task 5: Frontend — API client + types for bulk parsing

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

**Context:**
Add the `BulkParseRequest` and `BulkParseResponse` types, and the API client method.

**Step 1: Add types**

In `frontend/src/types/index.ts`, add (near the voice types):

```typescript
export interface BulkParseRequest {
  text: string;
}

export interface BulkParseResponse {
  tasks: VoiceParseResponse[];
}
```

**Step 2: Add API client method**

In `frontend/src/api/client.ts`, add the import for `BulkParseRequest` and `BulkParseResponse` to the import statement at top, then add to the `voice` object (after the `parse` method around line 219):

```typescript
parseBulk: (data: BulkParseRequest) =>
  post<BulkParseResponse>('/api/voice/parse-bulk', data),
```

**Step 3: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "feat: add bulk parse types and API client method"
```

---

### Task 6: Frontend — BulkImportTable component

**Files:**
- Create: `frontend/src/components/tasks/BulkImportTable.tsx`

**Context:**
Editable table showing AI-parsed tasks. Each row has inline editable fields. Confidence color coding on cells. Delete (X) per row. "Uložit vše" at bottom.

**Step 1: Create BulkImportTable**

Create `frontend/src/components/tasks/BulkImportTable.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { tasks as tasksApi, users as usersApi, categories as categoriesApi } from '@/api/client';
import { Priority, TaskStatus } from '@/types';
import type { VoiceParseResponse, User, Category } from '@/types';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/utils/constants';

interface BulkImportTableProps {
  parsedTasks: VoiceParseResponse[];
  onSaveComplete: (count: number) => void;
}

interface EditableRow {
  key: number;
  title: string;
  assigneeId: number | null;
  categoryId: number | null;
  priority: Priority;
  status: typeof TaskStatus[keyof typeof TaskStatus];
  dueDate: string;
  description: string;
  // confidence
  assigneeConfidence: number | null;
  categoryConfidence: number | null;
  priorityConfidence: number | null;
  dueDateConfidence: number | null;
  // state
  error: string | null;
  saved: boolean;
}

function cellClass(confidence: number | null): string {
  if (confidence === null || confidence === 0) return '';
  if (confidence < 0.5) return 'bg-red-50';
  if (confidence < 0.8) return 'bg-amber-50';
  return '';
}

export default function BulkImportTable({ parsedTasks, onSaveComplete }: BulkImportTableProps) {
  const [rows, setRows] = useState<EditableRow[]>(() =>
    parsedTasks.map((t, i) => ({
      key: i,
      title: t.title ?? '',
      assigneeId: t.assigneeId ?? null,
      categoryId: t.categoryId ?? null,
      priority: t.priority ?? Priority.Medium,
      status: t.status ?? TaskStatus.Open,
      dueDate: t.dueDate?.split('T')[0] ?? '',
      description: t.description ?? '',
      assigneeConfidence: t.assigneeConfidence ?? null,
      categoryConfidence: t.categoryConfidence ?? null,
      priorityConfidence: t.priorityConfidence ?? null,
      dueDateConfidence: t.dueDateConfidence ?? null,
      error: null,
      saved: false,
    }))
  );

  const [userList, setUserList] = useState<User[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersApi.list().then(setUserList).catch(() => {});
    categoriesApi.list().then(setCategoryList).catch(() => {});
  }, []);

  const updateRow = (key: number, field: string, value: unknown) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const removeRow = (key: number) => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const handleSaveAll = async () => {
    const unsaved = rows.filter(r => !r.saved && r.title.trim());
    if (unsaved.length === 0) return;

    setSaving(true);
    let savedCount = 0;

    for (const row of unsaved) {
      try {
        await tasksApi.create({
          title: row.title.trim(),
          description: row.description.trim() || undefined,
          assigneeId: row.assigneeId ?? undefined,
          categoryId: row.categoryId ?? undefined,
          priority: row.priority,
          dueDate: row.dueDate || undefined,
          status: row.status,
        });
        updateRow(row.key, 'saved', true);
        updateRow(row.key, 'error', null);
        savedCount++;
      } catch {
        updateRow(row.key, 'error', 'Nepodařilo se uložit');
      }
    }

    setSaving(false);

    if (savedCount === unsaved.length) {
      onSaveComplete(savedCount);
    }
  };

  const unsavedCount = rows.filter(r => !r.saved && r.title.trim()).length;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Název</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Přiřazeno</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Kategorie</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Priorita</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Termín</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Stav</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.key} className={row.saved ? 'opacity-50' : row.error ? 'bg-red-50' : ''}>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) => updateRow(row.key, 'title', e.target.value)}
                    disabled={row.saved}
                    className="w-full min-w-[200px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600"
                  />
                </td>
                <td className={`px-2 py-1 ${cellClass(row.assigneeConfidence)}`}>
                  <select
                    value={row.assigneeId ?? ''}
                    onChange={(e) => updateRow(row.key, 'assigneeId', e.target.value ? Number(e.target.value) : null)}
                    disabled={row.saved}
                    className="w-full min-w-[120px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600"
                  >
                    <option value="">—</option>
                    {userList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </td>
                <td className={`px-2 py-1 ${cellClass(row.categoryConfidence)}`}>
                  <select
                    value={row.categoryId ?? ''}
                    onChange={(e) => updateRow(row.key, 'categoryId', e.target.value ? Number(e.target.value) : null)}
                    disabled={row.saved}
                    className="w-full min-w-[120px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600"
                  >
                    <option value="">—</option>
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className={`px-2 py-1 ${cellClass(row.priorityConfidence)}`}>
                  <select
                    value={row.priority}
                    onChange={(e) => updateRow(row.key, 'priority', e.target.value)}
                    disabled={row.saved}
                    className="w-full min-w-[90px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600"
                  >
                    {Object.values(Priority).map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                </td>
                <td className={`px-2 py-1 ${cellClass(row.dueDateConfidence)}`}>
                  <input
                    type="date"
                    value={row.dueDate}
                    onChange={(e) => updateRow(row.key, 'dueDate', e.target.value)}
                    disabled={row.saved}
                    className="w-full min-w-[130px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600"
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    value={row.status}
                    onChange={(e) => updateRow(row.key, 'status', e.target.value)}
                    disabled={row.saved}
                    className="w-full min-w-[100px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600"
                  >
                    {Object.values(TaskStatus).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  {!row.saved && (
                    <button
                      onClick={() => removeRow(row.key)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Odebrat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                  {row.error && <span className="text-xs text-red-600">{row.error}</span>}
                  {row.saved && <span className="text-xs text-green-600">OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">Nebyly nalezeny žádné úkoly v textu.</p>
      )}

      {unsavedCount > 0 && (
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full bg-forest-800 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Ukládání...' : `Uložit vše (${unsavedCount} úkolů)`}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add frontend/src/components/tasks/BulkImportTable.tsx
git commit -m "feat: add BulkImportTable component for bulk task review"
```

---

### Task 7: Wire bulk import tab into CreateTaskPage

**Files:**
- Modify: `frontend/src/components/tasks/CreateTaskPage.tsx`

**Context:**
Replace the placeholder in the bulk tab with the real textarea + "Zpracovat" button + BulkImportTable. Uses the voice.parseBulk API.

**Step 1: Update CreateTaskPage with bulk import functionality**

Replace the full content of `frontend/src/components/tasks/CreateTaskPage.tsx`:

```tsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tasks, voice } from '@/api/client';
import { TaskStatus } from '@/types';
import type { CreateTaskRequest, TaskStatus as TaskStatusType, VoiceParseResponse } from '@/types';
import TaskForm from '@/components/shared/TaskForm';
import BulkImportTable from './BulkImportTable';

type Tab = 'single' | 'bulk';

export default function CreateTaskPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get('status') as TaskStatusType | null;
  const initialStatus = statusParam && Object.values(TaskStatus).includes(statusParam)
    ? statusParam
    : TaskStatus.Idea;

  const [activeTab, setActiveTab] = useState<Tab>('single');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bulk state
  const [bulkText, setBulkText] = useState('');
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [parsedTasks, setParsedTasks] = useState<VoiceParseResponse[] | null>(null);

  const handleCreateSingle = async (req: CreateTaskRequest) => {
    await tasks.create(req);
    setSuccessMsg('Úkol vytvořen');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleParseBulk = async () => {
    if (!bulkText.trim()) return;
    setBulkParsing(true);
    setBulkError(null);
    setParsedTasks(null);
    try {
      const result = await voice.parseBulk({ text: bulkText.trim() });
      if (result.tasks.length === 0) {
        setBulkError('Nebyly nalezeny žádné úkoly v textu.');
      } else {
        setParsedTasks(result.tasks);
      }
    } catch {
      setBulkError('Nepodařilo se zpracovat text. Zkuste to znovu.');
    } finally {
      setBulkParsing(false);
    }
  };

  const handleBulkSaveComplete = (count: number) => {
    navigate('/board', { state: { toast: `Vytvořeno ${count} úkolů` } });
  };

  const handleBulkReset = () => {
    setParsedTasks(null);
    setBulkText('');
    setBulkError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nový úkol</h1>

      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'single' ? 'text-forest-700 border-b-2 border-forest-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('single')}
        >
          Jeden úkol
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'bulk' ? 'text-forest-700 border-b-2 border-forest-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('bulk')}
        >
          Hromadný import
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {activeTab === 'single' && (
        <div className="max-w-lg">
          <TaskForm
            initialValues={{ status: initialStatus }}
            onSubmit={handleCreateSingle}
            idPrefix="create"
          />
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="space-y-4">
          {!parsedTasks && (
            <>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                placeholder="Vložte text, tabulku z Excelu nebo poznámky z porady..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 resize-y"
              />

              {bulkError && (
                <p className="text-sm text-red-600">{bulkError}</p>
              )}

              <button
                onClick={handleParseBulk}
                disabled={bulkParsing || !bulkText.trim()}
                className="w-full bg-forest-800 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkParsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Zpracovávám...
                  </span>
                ) : 'Zpracovat'}
              </button>
            </>
          )}

          {parsedTasks && (
            <>
              <BulkImportTable
                parsedTasks={parsedTasks}
                onSaveComplete={handleBulkSaveComplete}
              />
              <button
                onClick={handleBulkReset}
                className="w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
              >
                Zpět na import
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Build both frontend and backend**

Run: `cd frontend && npm run build`
Run: `cd backend && dotnet build --warnaserror`
Expected: Both succeed.

**Step 3: Commit**

```bash
git add frontend/src/components/tasks/CreateTaskPage.tsx
git commit -m "feat: wire bulk import tab with AI parsing and editable table"
```

---

### Task 8: Lint check and final verification

**Step 1: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: No errors.

**Step 2: Run frontend tests**

Run: `cd frontend && npm run test -- --run`
Expected: All tests pass. (VoiceTaskPreview tests may need updating if they test internal implementation — check for failures and fix.)

**Step 3: Run backend tests**

Run: `cd backend && dotnet test --no-build --verbosity normal`
Expected: All tests pass.

**Step 4: Fix any test failures**

If `VoiceTaskPreview` tests fail because the component now uses `TaskForm`, update the test to account for the new component structure. The test file is at `frontend/src/components/voice/VoiceTaskPreview.test.tsx` (if it exists — check with `ls`).

**Step 5: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: update tests for TaskForm refactor"
```
