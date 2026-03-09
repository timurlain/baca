# Task Creation Page — Design

## Goal

Add text-based task creation to Bača — both single tasks and bulk import from pasted text/tables using AI parsing.

## Entry Points

1. **"+" button in each column header** on the Kanban board — navigates to `/tasks/new?status={column}` (pre-fills status)
2. **"+ Nový úkol" button in the board header** — navigates to `/tasks/new` (no pre-fill)

## Page: `/tasks/new`

Two tabs: **"Nový úkol"** (single) | **"Hromadný import"** (bulk)

### Shared TaskForm Component

Extract from `VoiceTaskPreview.tsx` into `components/shared/TaskForm.tsx`:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Title | text input | yes | — |
| Description | textarea | no | — |
| Assignee | dropdown (fetches users) | no | — |
| Category | dropdown (fetches categories) | no | — |
| Priority | dropdown (Low/Medium/High) | no | Medium |
| Status | dropdown (5 statuses) | no | Idea |
| Due Date | date picker | no | — |

Supports optional `confidence` prop per field for color-coded borders (red < 0.5, amber < 0.8, green >= 0.8). Used by VoiceTaskPreview; ignored by direct creation.

`VoiceTaskPreview` wraps `TaskForm` with transcription box + confidence indicators.

### Tab 1: "Nový úkol"

- `TaskForm` with empty fields
- Status pre-filled from `?status=` query param, defaults to "Idea"
- **"Vytvořit úkol"** primary button → `POST /api/tasks`
- On success: toast "Úkol vytvořen", form clears, stay on page
- Mobile: full-width stacked layout, 44px touch targets

### Tab 2: "Hromadný import"

**Step 1 — Input:**
- Large textarea: "Vložte text, tabulku nebo poznámky z porady..."
- **"Zpracovat"** button → `POST /api/tasks/parse-bulk`

**Step 2 — Review:**
- Editable table: Title | Assignee | Category | Priority | Due Date | Status
- Confidence color coding on cells (same scheme as voice)
- Each row has delete (X) button
- **"Uložit vše"** button → sequential `POST /api/tasks` for each row
- After save: redirect to `/board`, toast "Vytvořeno X úkolů"
- Mobile: horizontal scroll (desktop-primary workflow)

## Backend: `POST /api/tasks/parse-bulk`

- Request: `{ text: string }`
- Reuses `VoiceParsingService` logic: fetches users + categories, sends to Claude Haiku 4.5
- Adapted system prompt for text input (not speech transcription), expects multiple tasks
- Response: `{ tasks: VoiceParseResponse[] }`
- Same confidence scoring and fuzzy matching

## Error Handling

- Empty textarea → "Zpracovat" disabled
- AI parsing failure → "Nepodařilo se zpracovat text. Zkuste to znovu."
- No tasks found → "Nebyly nalezeny žádné úkoly v textu."
- Individual task creation fails in bulk → red row, error message, user can retry
- Title empty on single create → validation prevents submit

## Components Affected

| Component | Change |
|-----------|--------|
| `VoiceTaskPreview.tsx` | Extract form into shared `TaskForm` |
| `KanbanBoard.tsx` | Add "+ Nový úkol" button in header |
| `KanbanColumn.tsx` | Add "+" button in column header |
| `App.tsx` | Add route `/tasks/new` |
| New: `TaskForm.tsx` | Shared form component |
| New: `CreateTaskPage.tsx` | Page with two tabs |
| New: `BulkImportTable.tsx` | Editable table for parsed results |
| New: `BulkParsingEndpoint` | Backend endpoint for text parsing |
| Modified: `VoiceParsingService` | Extract reusable parsing logic |

## Tech

- Frontend: React, Tailwind, TanStack Query for user/category fetching
- Backend: Claude Haiku 4.5 via Anthropic API (same as voice)
- No new dependencies required
