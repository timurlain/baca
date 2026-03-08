# Bača — Complete Project Blueprint

> **Bača** (bača = hlavní pastýř, šéf salaše) — task tracker pro organizaci Ovčiny.
> Tento dokument je kompletní specifikace + implementační plán pro Claude Code agenty.

## Jak tento dokument používat

Tento dokument má dvě hlavní části:

1. **ČÁST 1: Specifikace** — CO se staví (features, data model, API, UX, infrastruktura, testy, offline)
2. **ČÁST 2: Implementační plán** — JAK se staví (fáze, agent prompts, file ownership, Tissaia skills)

Každý Claude Code agent dostane tento celý dokument. Agent prompt v Části 2 mu řekne, které sekce z Části 1 jsou pro něj relevantní a které soubory smí měnit.

## Tissaia Skills — použij existující

Agenti by měli používat tyto Tissaia skills kde je to relevantní:

| Skill | Kde použít | Proč |
|-------|-----------|------|
| **`tinkerer`** | Agents A, B, C, D (Phase 1) | Obecný implementační agent. Sleduje plány, matchuje existující patterny, buildí často, píše základní testy, eskaluje architekturní rozhodnutí. |
| **`inquisitor`** | Phase 2 (Integration), Phase 3 (Hardening) | Code review agent. 6 dimenzí review: security, correctness, error handling, performance, maintainability, readability. Severity-ranked findings. |

Každý agent prompt v Části 2 uvádí, které skills má agent použít.

> **Instalace skills:** V Claude Code terminálu spusť `/tissaia install tinkerer` a `/tissaia install inquisitor`.

---
---

# ČÁST 1: SPECIFIKACE


## Účel

Webová aplikace pro organizaci LARP hry **Ovčina** (30. ročník, 1.–3. května 2026, ~120 dětí + ~40 organizátorů, lesy u Veselé). Kanban-style task tracker s drag-and-drop, kategoriemi, komentáři, subtasky a dashboardem.

---

## Tech Stack

| Vrstva | Technologie |
|--------|-------------|
| Backend | C# .NET 10, Minimal API |
| Frontend | React (Vite), TypeScript |
| Databáze | PostgreSQL 16 (Azure Flexible Server) via EF Core, Npgsql provider |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Styling | Tailwind CSS |
| Offline | Service Worker (Workbox) + IndexedDB (idb) |
| Auth | Magic link (email token) + shared guest PIN |
| Email | SMTP (konfigurovatelné — Mailgun, SendGrid, vlastní SMTP) |
| Speech-to-Text | Azure Speech Services (cs-CZ) |
| Task Parsing LLM | Claude Haiku 4.5 (Anthropic API) |
| Notifikace | Twilio WhatsApp API (1:1 zprávy při přiřazení úkolu) |
| Testing | xUnit (backend) + Vitest + RTL (frontend) + Playwright (E2E) |
| CI/CD | GitHub Actions → deploy to Azure |
| Hosting | Azure Container Apps |
| Repo | GitHub, public (MIT licence) |

---

## Příkazy (Commands)

Tyto příkazy agenti používají neustále. Musí fungovat v každé fázi:

```bash
# Backend
cd backend
dotnet restore                          # obnoví NuGet balíčky
dotnet build --no-restore               # kompilace
dotnet test --no-build --verbosity normal --collect:"XPlat Code Coverage"  # testy + coverage
dotnet ef migrations add <Name>         # nová migrace
dotnet ef database update               # aplikuj migrace na DB
dotnet run --project Baca.Api           # spusť backend (port 8080)

# Frontend
cd frontend
npm ci                                  # čistá instalace závislostí
npm run dev                             # dev server (port 3000)
npm run build                           # produkční build
npm run lint                            # ESLint
npm run test                            # Vitest (unit + component testy)
npm run test -- --coverage              # testy s coverage reportem
npx playwright install --with-deps      # instalace Playwright prohlížečů
npm run test:e2e                        # Playwright E2E testy

# Docker (lokální dev)
docker-compose up -d db                 # jen PostgreSQL
docker-compose up                       # celý stack
docker-compose down -v                  # smazání včetně volumes

# Git
git checkout -b phase-1/backend-core    # nová branch
gh pr create --title "..." --body "..." # vytvoření PR
gh run list                             # stav CI pipeline
gh run view <id>                        # detail CI runu
```

---

## Code Style

### Backend (C#)
- **Naming**: PascalCase pro třídy, metody, properties. camelCase pro lokální proměnky a parametry.
- **Soubory**: jeden typ na soubor, jméno souboru = jméno třídy.
- **Async**: všechny I/O operace async, suffix `Async` na metodách.
- **Nullable**: `<Nullable>enable</Nullable>`, explicitní null checking.
- **Formátování**: `dotnet format` standard (výchozí .editorconfig).

```csharp
// Vzorový endpoint (tento styl sleduj)
public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks")
            .RequireAuthorization();

        group.MapGet("/", GetAllAsync);
        group.MapPost("/", CreateAsync);
    }

    private static async Task<IResult> GetAllAsync(
        BacaDbContext db,
        [AsParameters] TaskFilterRequest filter,
        CancellationToken ct)
    {
        var tasks = await db.Tasks
            .Where(t => filter.Status == null || t.Status == filter.Status)
            .OrderBy(t => t.SortOrder)
            .Select(t => t.ToDto())
            .ToListAsync(ct);

        return Results.Ok(tasks);
    }
}
```

### Frontend (TypeScript/React)
- **Naming**: PascalCase pro komponenty, camelCase pro proměnné a funkce, UPPER_SNAKE pro konstanty.
- **Komponenty**: funkcionální, s hooks. Žádné class components.
- **Exporty**: default export pro komponenty, named export pro utility.
- **Styling**: pouze Tailwind utility classes, žádné inline styles, žádné CSS moduly.

```tsx
// Vzorová komponenta (tento styl sleduj)
import { useState } from 'react';
import { TaskStatus, type TaskItem } from '@/types';
import { STATUS_COLORS } from '@/utils/constants';

interface TaskCardProps {
  task: TaskItem;
  onSelect: (id: number) => void;
  isGuest?: boolean;
}

export default function TaskCard({ task, onSelect, isGuest = false }: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(task.id)}
    >
      <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
      {task.dueDate && (
        <span className={isOverdue ? 'text-red-600 text-xs' : 'text-gray-500 text-xs'}>
          {new Date(task.dueDate).toLocaleDateString('cs-CZ')}
        </span>
      )}
    </div>
  );
}
```

---

## Git Workflow

- **Branch naming**: `phase-{N}/{scope}` (např. `phase-1/backend-core`)
- **Commit messages**: konvenční formát: `feat: přidání focus endpointu`, `fix: oprava auth cookie expirace`, `test: přidání AuthorizationMatrixTests`, `chore: update NuGet balíčků`
- **PR popis**: co bylo implementováno, seznam změněných souborů, screenshot (pokud UI), checklist z "Definition of done"
- **Merge strategie**: squash merge do main
- **Branch protection (main)**: require PR, require passing CI, no direct push, require 1 approval (od tebe)

---

## Hranice (Boundaries)

Třístupňový systém pro každého agenta:

| Stupeň | Příklady |
|--------|---------|
| ✅ **Vždy dělej** | Spusť `dotnet build` po každé změně. Spusť testy. Piš česky v UI. Používej typy z `types/index.ts`. Commituj často. |
| ⚠️ **Nejprve se zeptej** | Přidání nového NuGet/npm balíčku. Změna DB schématu. Změna API kontraktu (DTO). Přidání nové route. Architekturní rozhodnutí mimo plán. |
| 🚫 **Nikdy nedělej** | Commitování secrets/API klíčů. Editace souborů mimo tvůj ownership. Změna frozen contracts (Models, DTOs, types). Smazání existujících testů. Přímý push do main. |

---

## Uživatelské role

| Role | Práva |
|------|-------|
| **Admin** | Plný CRUD: úkoly, kategorie, uživatelé. Správa systému. |
| **User** | Vytváření, editace, komentování úkolů. Drag-and-drop změna stavu. Nemůže spravovat uživatele ani kategorie. |
| **Guest** | Pouze čtení. Vidí board a dashboard, nemůže nic měnit. |

---

## Autentizace

### Magic Link (Admin & User)
1. Admin vytvoří uživatele: jméno + email + role (Admin/User).
2. Na přihlašovací stránce uživatel zadá svůj email.
3. Systém pošle email s odkazem obsahujícím jednorázový token (platnost: 7 dní).
4. Kliknutím na odkaz se uživatel přihlásí, server nastaví httpOnly cookie (session, platnost: 30 dní).
5. Žádné heslo nikde — jednoduchost pro netechnické organizátory.

### Guest PIN
1. Admin nastaví sdílený PIN v nastavení (např. `ovcina2026`).
2. Guest zadá PIN na přihlašovací stránce → read-only přístup.
3. Žádný email, žádný účet — jednoduché pro rodiče a pozorovatele.

### Přihlašovací stránka
- Dvě záložky/sekce: **Organizátor** (email → magic link) a **Host** (PIN).
- Po přihlášení redirect na dashboard.

---

## Datový model

### User
```
Id              : int (PK, autoincrement)
Name            : string (required, max 100)
Email           : string (nullable — null pro guest sessions)
Phone           : string (nullable, formát +420xxx, pro WhatsApp notifikace)
Role            : enum { Admin, User, Guest }
GameRoleId      : int (FK → GameRole, nullable)
AvatarColor     : string (hex barva pro avatar, generuje se při vytvoření)
CreatedAt       : DateTime
IsActive        : bool (soft delete)
```

### LoginToken
```
Id              : int (PK)
UserId          : int (FK → User)
Token           : string (GUID, unique)
ExpiresAt       : DateTime
IsUsed          : bool
CreatedAt       : DateTime
```

### GameRole
```
Id              : int (PK)
Name            : string (required, max 50, unique) — herní role na LARPu
Description     : string (nullable, max 200) — popis role
Color           : string (hex barva, max 7, default "#3B82F6")
SortOrder       : int
CreatedAt       : DateTime
```

> **Poznámka:** GameRole je herní role (Osud, Vládce, Příšera…) — oddělená od UserRole (Admin/User/Guest), která řídí přístupová práva. Každý uživatel může mít max 1 GameRole (nullable). Admin spravuje GameRoles podobně jako Category.

### Category
```
Id              : int (PK)
Name            : string (required, max 50) — např. "Hra", "Logistika", "Jídlo"
Color           : string (hex barva)
SortOrder       : int
CreatedAt       : DateTime
```

### Task
```
Id              : int (PK)
Title           : string (required, max 200)
Description     : string (nullable, markdown text)
Status          : enum { Idea, Open, InProgress, ForReview, Done }
Priority        : enum { Low, Medium, High }
CategoryId      : int (FK → Category, nullable)
AssigneeId      : int (FK → User, nullable)
ParentTaskId    : int (FK → Task, nullable) — subtask vazba
DueDate         : DateTime? (nullable)
SortOrder       : int (pořadí v rámci sloupce)
CreatedById     : int (FK → User)
CreatedAt       : DateTime
UpdatedAt       : DateTime
```

### Comment
```
Id              : int (PK)
TaskId          : int (FK → Task)
AuthorId        : int (FK → User)
Text            : string (required, max 2000)
CreatedAt       : DateTime
```

### AppSettings
```
Id              : int (PK, vždy 1)
GuestPin        : string (hashed)
AppName         : string (default "Bača")
```

---

## Stavy úkolů (Status Flow)

```
Idea → Open → In Progress → For Review → Done
```

- Drag-and-drop umožňuje přesun do **jakéhokoliv** stavu (nemusí být sekvenční).
- Barvy stavů:
  - **Idea**: šedá (#9CA3AF)
  - **Open**: modrá (#3B82F6)
  - **In Progress**: žlutá/oranžová (#F59E0B)
  - **For Review**: fialová (#8B5CF6)
  - **Done**: zelená (#10B981)

---

## Stránky aplikace

### 1. Přihlášení (`/login`)
- Dvě sekce: Organizátor (email input + "Poslat odkaz") a Host (PIN input + "Vstoupit").
- Minimalistický design s logem/názvem Bača.

### 2. Dashboard (`/dashboard`)
- **Hlavní přehled:**
  - Celkový počet úkolů a koláčový/donutový graf podle stavu.
  - Počet úkolů po splatnosti (overdue) — červeně zvýrazněné.
  - Progress bar celkový (Done / Total).
  - Progress bars po kategoriích.
- **Rychlé statistiky:**
  - Úkoly přiřazené aktuálnímu uživateli.
  - Naposledy změněné úkoly (posledních 5–10).
- Kliknutí na statistiku → filtrovaný board.

### 3. Můj fokus (`/` — výchozí na mobilu)

Minimalistická stránka pro organizátory v terénu. Na mobilu je **výchozí landing page** (detekce přes viewport šířku < 768px). Na desktopu přístupná přes navigaci.

**Co zobrazuje:**
- **Top 1–3 úkoly** přiřazené aktuálnímu uživateli, seřazené podle:
  1. Priorita (High → Medium → Low)
  2. Due date (nejbližší první, overdue úplně nahoře)
  3. Pouze stavy Open a In Progress (ne Idea, ne Done, ne For Review)
- Každý úkol jako **velká karta** (touch-friendly, min. 80px výška):
  - Titulek (velký font)
  - Kategorie (barevný štítek)
  - Due date (červeně pokud overdue)
  - Priorita (barevný indikátor)
  - Počet subtasků (pokud má): "2/4 hotovo"
- **Akční tlačítka na kartě** (velká, snadno klikatelná):
  - "Hotovo ✓" → přesune do Done (s potvrzením swipe nebo tap)
  - "K review →" → přesune do For Review
  - Klik na kartu → otevře detail (modal)
- **Prázdný stav**: pokud nemá žádné úkoly → friendly zpráva "Všechno splněno! 🎉" + odkaz na board.
- **Mikrofon FAB** je zde obzvlášť důležitý (rychlé přidání úkolu v terénu).

**Routing logika:**
- Mobilní uživatel (< 768px) → `/` renderuje My Focus.
- Desktopový uživatel (≥ 768px) → `/` renderuje Dashboard.
- Obě stránky vždy dostupné přes navigaci.

### 4. Kanban Board — Všechny úkoly (`/board`)
- **5 sloupců** (swim lanes): Idea | Open | In Progress | For Review | Done.
- **Drag-and-drop** karet mezi sloupci → změna stavu.
- **Drag-and-drop** karet v rámci sloupce → změna pořadí (SortOrder).
- **Karta úkolu zobrazuje:**
  - Titulek
  - Kategorie (barevný štítek)
  - Priorita (ikonka nebo barevný indikátor)
  - Assignee (barevný avatar s iniciálami)
  - Due date (červeně pokud po splatnosti)
  - Počet subtasků (pokud má) — např. "3/5" (hotové/celkem)
  - Počet komentářů (ikonka)
  - **"Vezmu si to"** — tlačítko na kartách bez assignee (ikonka 🙋 nebo ručička). Klik → přiřadí úkol aktuálnímu uživateli + pošle WhatsApp notifikaci. Skryté pro Guest.
- **Filtrování** (horní lišta):
  - Podle kategorie (multi-select dropdown)
  - Podle přiřazeného uživatele (multi-select)
  - Podle priority
  - Fulltextové hledání v titulku
- **Klik na kartu** → otevře detail (modal nebo side panel).

### 5. Kanban Board — Per User (`/board/user`)
- Levý panel/sidebar: **seznam uživatelů s barevnými avatary** (klikací).
- Klik na uživatele → board zobrazí pouze jeho úkoly.
- Stejný layout 5 sloupců jako hlavní board.
- Zobrazuje i nepřiřazené úkoly pokud není vybrán konkrétní uživatel.

### 6. Detail úkolu (modal/side panel)
- Editace všech polí: titulek, popis (markdown), stav, priorita, kategorie, assignee, due date.
- **Subtasky:**
  - Seznam subtasků se stavem a checkbox pro rychlé "Done".
  - Tlačítko "Přidat subtask" (inline formulář).
  - Subtasky se zobrazují i na hlavním boardu jako samostatné karty (s odkazem na parent).
- **Komentáře:**
  - Chronologický seznam komentářů.
  - Input pro nový komentář.
  - Zobrazení autora a času.
- **Metadata:** Vytvořil, vytvořeno, naposledy změněno.
- Guest: vše read-only, bez tlačítek pro editaci.

### 7. Hlasový vstup (`/voice`)

Dedikovaná stránka pro rychlé vytváření úkolů hlasem. Optimalizovaná pro mobil — velké tlačítko, minimální UI.

**Flow:**
1. Uživatel klikne na velké tlačítko mikrofonu (pulsující animace při nahrávání).
2. Mluví česky, např.: *"Honza potřebuje koupit padesát metrů lana, je to urgentní, spadá to pod logistiku, do pátku."*
3. Audio se odešle na backend → Azure Speech Services (cs-CZ) → transkripce.
4. Transkripce se pošle do Claude Haiku 4.5 → extrakce strukturovaných polí.
5. UI zobrazí **náhled parsovaného úkolu**:
   - Titulek: "Koupit 50m lana"
   - Assignee: Honza (matched z existujících uživatelů)
   - Priorita: Vysoká
   - Kategorie: Logistika (matched z existujících kategorií)
   - Due date: pátek (resolved na konkrétní datum)
   - Stav: Open (default)
6. Uživatel může **editovat** jakékoliv pole před uložením.
7. Klik na "Uložit" → vytvoří úkol přes standardní POST /api/tasks.
8. Potvrzení (toast) + mikrofon je připraven na další úkol.

**UI prvky:**
- Velký mikrofon uprostřed (60%+ šířky na mobilu).
- Vizuální feedback: idle → nahrávání (pulsující červená) → zpracovávám (spinner) → náhled.
- Přepis surového textu zobrazený šedě nad parsovaným výsledkem (pro kontrolu).
- Všechna pole editovatelná: title (text input), assignee (dropdown), category (dropdown), priority (select), due date (date picker), status (select), description (textarea).
- Tlačítka: "Uložit úkol" (primární), "Zkusit znovu" (sekundární), "Zrušit".
- Confidence indikátor: pokud AI není jistý matchem (assignee/category), zvýrazní pole žlutě.

**Globální plovoucí tlačítko (FAB):**
- Na všech stránkách (kromě login) zobrazit malé plovoucí tlačítko mikrofonu (vpravo dole).
- Klik → otevře modal/overlay se stejným voice flow jako dedikovaná stránka.
- Po uložení úkolu se modal zavře a board se refreshne.
- Skryté pro Guest roli.

### 8. Admin — Správa uživatelů (`/admin/users`)
- Tabulka uživatelů: jméno, email, telefon, role, herní role, stav (aktivní/neaktivní).
- **Přidat uživatele**: jméno + email + telefon (volitelný, +420...) + role (Admin/User) + herní role (volitelná).
- **Editace**: změna role, herní role, telefonu, deaktivace.
- **Znovu odeslat magic link** — tlačítko u každého uživatele.
- Nelze smazat uživatele s přiřazenými úkoly (jen deaktivovat).

### 9. Admin — Správa kategorií (`/admin/categories`)
- Seznam kategorií s barvou a pořadím.
- Přidat / editovat / smazat kategorii.
- Drag-and-drop řazení kategorií.
- Nelze smazat kategorii s přiřazenými úkoly (nutné nejprve přesunout).

### 10. Admin — Správa herních rolí (`/admin/gameroles`)
- Seznam herních rolí s barvou, popisem a pořadím.
- Přidat / editovat / smazat herní roli.
- Drag-and-drop řazení rolí.
- Nelze smazat roli s přiřazenými uživateli (nutné nejprve odebrat).

### 11. Admin — Nastavení (`/admin/settings`)
- Změna guest PINu.
- Název aplikace (default "Bača").

### 12. Uživatelská příručka (`/guide`)
- **Welcome page**: max 1/2 A4 (200 slov). Co je Bača, 3 kroky "jak začít", odkazy na témata.
- **Téma stránky** (drill-down, max 1 A4 každá): Board, Fokus, Hlasový vstup, Správa (admin only), Offline.
- Přístupné přes "?" tlačítko v headeru (desktop) a tab baru (mobil).
- Viditelné pro všechny role. Admin sekce skrytá pro User/Guest.
- Terminologie v příručce musí **přesně odpovídat** tomu, co uživatel vidí v UI.

---

## API Endpoints (Minimal API)

### Auth
```
POST   /api/auth/request-link     { email }                → pošle magic link
GET    /api/auth/verify/{token}                             → ověří token, nastaví cookie, redirect
POST   /api/auth/guest             { pin }                  → ověří PIN, nastaví guest cookie
POST   /api/auth/logout                                     → smaže cookie
GET    /api/auth/me                                         → aktuální uživatel + role
```

### Tasks
```
GET    /api/tasks                  ?status&category&assignee&search&parentId  → seznam
GET    /api/tasks/{id}                                      → detail vč. subtasků a komentářů
POST   /api/tasks                  { title, description, status, priority, categoryId, assigneeId, parentTaskId, dueDate }
PUT    /api/tasks/{id}             { ... }                  → update
PATCH  /api/tasks/{id}/status      { status, sortOrder }    → drag-and-drop změna stavu
PATCH  /api/tasks/{id}/sort        { sortOrder }            → přeřazení v rámci sloupce
PATCH  /api/tasks/{id}/assign-me                            → "Vezmu si to" — přiřadí current user + WhatsApp notifikace
DELETE /api/tasks/{id}                                      → smazání (cascade subtasky)
```

### Focus (User/Admin)
```
GET    /api/focus                                           → top 3 úkoly current usera (Open/InProgress, sorted by priority + due date)
```

### Comments
```
GET    /api/tasks/{id}/comments                             → komentáře k úkolu
POST   /api/tasks/{id}/comments    { text }                 → přidat komentář
```

### Categories (Admin only)
```
GET    /api/categories                                      → seznam
POST   /api/categories             { name, color }
PUT    /api/categories/{id}        { name, color, sortOrder }
DELETE /api/categories/{id}                                  → jen pokud nemá úkoly
```

### Game Roles (Admin only)
```
GET    /api/gameroles                                       → seznam
POST   /api/gameroles              { name, description, color }
PUT    /api/gameroles/{id}         { name, description, color, sortOrder }
DELETE /api/gameroles/{id}                                   → jen pokud nemá přiřazené uživatele
```

### Users (Admin only)
```
GET    /api/users                                           → seznam
POST   /api/users                  { name, email, phone, role, gameRoleId } → vytvoří + pošle magic link
PUT    /api/users/{id}             { name, phone, role, gameRoleId, isActive }
POST   /api/users/{id}/resend-link                          → znovu pošle magic link
```

### Dashboard
```
GET    /api/dashboard                                       → agregované statistiky
```

### Voice (User/Admin only)
```
POST   /api/voice/transcribe       multipart: { audio }     → Azure STT → vrátí { transcription }
POST   /api/voice/parse            { transcription }        → Claude Haiku → vrátí { parsedTask }
```

Odpověď `/api/voice/parse`:
```json
{
  "title": "Koupit 50m lana",
  "description": null,
  "assigneeName": "Honza",
  "assigneeId": 3,
  "assigneeConfidence": 0.95,
  "categoryName": "Logistika",
  "categoryId": 2,
  "categoryConfidence": 0.90,
  "priority": "High",
  "priorityConfidence": 0.85,
  "dueDate": "2026-04-24",
  "dueDateConfidence": 0.70,
  "status": "Open",
  "rawTranscription": "Honza potřebuje koupit padesát metrů lana, je to urgentní, spadá to pod logistiku, do pátku."
}
```

Confidence < 0.7 → pole zvýrazněno žlutě v UI (uživatel by měl zkontrolovat).

### Settings (Admin only)
```
GET    /api/settings
PUT    /api/settings               { guestPin, appName }
```

### Health (public, pro Azure probe)
```
GET    /api/health                                          → { status: "healthy", db: "ok" }
```

---

## Autorizace (middleware)

| Endpoint vzor | Guest | User | Admin |
|---------------|-------|------|-------|
| `GET /api/*` | ✅ | ✅ | ✅ |
| `GET /api/focus` | ❌ | ✅ | ✅ |
| `POST/PUT/PATCH/DELETE /api/tasks/*` | ❌ | ✅ | ✅ |
| `POST /api/tasks/*/comments` | ❌ | ✅ | ✅ |
| `POST /api/voice/*` | ❌ | ✅ | ✅ |
| `/api/categories` (write) | ❌ | ❌ | ✅ |
| `/api/gameroles` (write) | ❌ | ❌ | ✅ |
| `/api/users/*` | ❌ | ❌ | ✅ |
| `/api/settings` (write) | ❌ | ❌ | ✅ |

---

## UX / Design pravidla

- **Jazyk UI**: čeština (všechny labely, tlačítka, hlášky).
- **Responzivní**: musí fungovat na mobilu (organizátoři v lese).
- **Barevné schéma**: tmavě zelený header (lesní téma), světlé pozadí, barevné kategorie.
- **Avatary**: barevné kruhy s iniciálami uživatelů (žádné obrázky).
- **Font**: Inter nebo system-ui.
- **Loading states**: skeleton loading pro board a dashboard.
- **Toast notifikace**: pro úspěšné akce (úkol vytvořen, stav změněn, ...).
- **Potvrzovací dialog**: pro mazání úkolů/kategorií.
- **Přístupnost**: klávesové zkratky pro vytvoření úkolu (Ctrl+N), základní ARIA atributy.
- **Navigace (desktop)**: horní lišta — Dashboard | Board | Per User | Hlasový vstup | Admin (jen pro Admin). Vpravo: avatar aktuálního uživatele + "Můj fokus" odkaz + badge s počtem mých úkolů.
- **Navigace (mobil)**: spodní tab bar — Fokus | Board | Hlas | Dashboard | (Admin). Max 5 položek, velké ikony. Badge na "Fokus" tabu s počtem aktivních úkolů.

---

## Projektová struktura

```
baca/
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── Baca.Api/
│   │   ├── Program.cs                  # Minimal API setup, middleware, DI
│   │   ├── Baca.Api.csproj
│   │   ├── appsettings.json            # ConnectionString, SMTP config, JWT secret
│   │   │
│   │   ├── Data/
│   │   │   ├── BacaDbContext.cs
│   │   │   └── Migrations/
│   │   │
│   │   ├── Models/
│   │   │   ├── User.cs
│   │   │   ├── Task.cs
│   │   │   ├── Comment.cs
│   │   │   ├── Category.cs
│   │   │   ├── GameRole.cs
│   │   │   ├── LoginToken.cs
│   │   │   └── AppSettings.cs
│   │   │
│   │   ├── Endpoints/
│   │   │   ├── AuthEndpoints.cs
│   │   │   ├── TaskEndpoints.cs
│   │   │   ├── CommentEndpoints.cs
│   │   │   ├── CategoryEndpoints.cs
│   │   │   ├── GameRoleEndpoints.cs
│   │   │   ├── UserEndpoints.cs
│   │   │   ├── DashboardEndpoints.cs
│   │   │   ├── FocusEndpoints.cs
│   │   │   ├── SettingsEndpoints.cs
│   │   │   ├── VoiceEndpoints.cs
│   │   │   └── HealthEndpoints.cs       # GET /api/health (Azure probe)
│   │   │
│   │   ├── Services/
│   │   │   ├── AuthService.cs
│   │   │   ├── EmailService.cs
│   │   │   ├── DashboardService.cs
│   │   │   ├── WhatsAppNotificationService.cs # Twilio WhatsApp API
│   │   │   ├── VoiceTranscriptionService.cs   # Azure Speech SDK
│   │   │   └── VoiceParsingService.cs         # Claude Haiku 4.5 task extraction
│   │   │
│   │   ├── Middleware/
│   │   │   └── AuthMiddleware.cs
│   │   │
│   │   └── DTOs/
│   │       ├── TaskDto.cs
│   │       ├── CreateTaskRequest.cs
│   │       └── ...
│   │
│   ├── Baca.Api.Tests/               # unit testy
│   │   ├── Services/
│   │   │   ├── AuthServiceTests.cs
│   │   │   ├── DashboardServiceTests.cs
│   │   │   ├── VoiceParsingServiceTests.cs
│   │   │   └── WhatsAppNotificationServiceTests.cs
│   │   └── Baca.Api.Tests.csproj
│   │
│   ├── Baca.Api.IntegrationTests/    # integration testy (Testcontainers + PostgreSQL)
│   │   ├── BacaWebApplicationFactory.cs
│   │   ├── AuthFlowTests.cs
│   │   ├── TaskCrudTests.cs
│   │   ├── AuthorizationMatrixTests.cs
│   │   ├── FocusEndpointTests.cs
│   │   └── Baca.Api.IntegrationTests.csproj
│   │
│   └── Baca.Api.sln
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   │
│   ├── e2e/                            # Playwright E2E testy
│   │   ├── auth.spec.ts
│   │   ├── board.spec.ts
│   │   ├── focus.spec.ts
│   │   ├── voice.spec.ts
│   │   ├── admin.spec.ts
│   │   └── mobile.spec.ts
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── sw.ts                       # Service Worker (Workbox)
│       ├── api/
│       │   └── client.ts              # fetch wrapper, auth header
│       │
│       ├── offline/
│       │   ├── db.ts                  # IndexedDB schema (idb)
│       │   ├── syncQueue.ts           # pending actions queue
│       │   └── offlineIndicator.tsx   # offline banner component
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── BottomTabBar.tsx    # mobile navigation
│       │   │   ├── Sidebar.tsx
│       │   │   └── Layout.tsx
│       │   │
│       │   ├── board/
│       │   │   ├── KanbanBoard.tsx
│       │   │   ├── KanbanColumn.tsx
│       │   │   ├── TaskCard.tsx
│       │   │   └── TaskDetailModal.tsx
│       │   │
│       │   ├── dashboard/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── StatsCard.tsx
│       │   │   └── ProgressChart.tsx
│       │   │
│       │   ├── admin/
│       │   │   ├── UserManagement.tsx
│       │   │   ├── CategoryManagement.tsx
│       │   │   ├── GameRoleManagement.tsx
│       │   │   └── Settings.tsx
│       │   │
│       │   ├── auth/
│       │   │   └── LoginPage.tsx
│       │   │
│       │   ├── voice/
│       │   │   ├── VoicePage.tsx              # Dedicated /voice page
│       │   │   ├── VoiceRecorder.tsx          # Mic button + audio capture
│       │   │   ├── VoiceTaskPreview.tsx       # Parsed task preview + edit form
│       │   │   └── VoiceFab.tsx               # Floating action button (global)
│       │   │
│       │   ├── focus/
│       │   │   └── FocusPage.tsx              # My Focus — top 1–3 tasks
│       │   │
│       │   └── shared/
│       │       ├── Avatar.tsx
│       │       ├── Badge.tsx
│       │       ├── FilterBar.tsx
│       │       └── ConfirmDialog.tsx
│       │
│       ├── hooks/
│       │   ├── useTasks.ts
│       │   ├── useFocus.ts                # Focus page data fetching + offline cache
│       │   ├── useAuth.ts
│       │   ├── useOnlineStatus.ts         # navigator.onLine + sync trigger
│       │   ├── useVoiceRecorder.ts        # MediaRecorder, audio state
│       │   └── useDragAndDrop.ts
│       │
│       ├── types/
│       │   └── index.ts
│       │
│       └── utils/
│           ├── constants.ts           # status barvy, priority labels
│           └── helpers.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml                     # CI/CD pipeline
│
└── LICENSE                            # MIT
```

---

## Seed data (první spuštění)

Při prvním spuštění (prázdná DB) automaticky vytvořit (EF Core migration + seed):

1. **Admin uživatel**: Tomáš (tvůj email + telefon) s rolí Admin.
2. **Výchozí kategorie**: Hra, Logistika, Jídlo, Rekvizity, Komunikace (s barvami).
3. **Výchozí herní role**: Osud (#7DD3FC), Vládce (#8B5CF6), Obchodník (#D4A017), Příručí (#3B82F6), CP (#EC4899), Knihovnice (#1E3A5F), Příšera (#991B1B), Hraničář (#84CC16), Technická pomoc (#6B7280), Fotograf (#A855F7).
4. **Guest PIN**: `ovcina2026` (konfigurovatelné přes env var, hashované BCrypt).

---

## Infrastruktura — Azure

### Přehled prostředků

| Prostředek | Azure služba | Tier | Odhad ceny/měsíc |
|-----------|-------------|------|-------------------|
| Backend + Frontend | Azure Container Apps | Consumption (scale-to-zero) | ~$5 |
| Databáze | Azure Database for PostgreSQL Flexible | Burstable B1ms | ~$13 |
| Container Registry | Azure Container Registry | Basic | ~$5 |
| DNS + HTTPS | Custom domain + managed certificate | (zdarma s Container Apps) | $0 |
| **Celkem** | | | **~$23/měsíc** |

### Azure Container Apps

- **Environment**: `baca-env` (shared environment, East/West Europe dle latence)
- **Backend app**: `baca-api`
  - Image: `bacacr.azurecr.io/baca-api:latest`
  - Min replicas: 0 (scale to zero), Max: 2
  - CPU: 0.25, Memory: 0.5Gi
  - Ingress: external, port 8080
  - Health probe: `GET /api/health`
- **Frontend app**: `baca-web`
  - Image: `bacacr.azurecr.io/baca-web:latest` (nginx + static build)
  - Min replicas: 0, Max: 2
  - CPU: 0.25, Memory: 0.5Gi
  - Ingress: external, port 80
  - Custom domain: `baca.ovcina.cz` (nebo jiná)
- **Secrets**: všechny API klíče a connection stringy uložené jako Container Apps secrets, namapované na env vars.

### PostgreSQL Flexible Server

- **Server**: `baca-db`
- **Tier**: Burstable B1ms (1 vCore, 2GB RAM)
- **Storage**: 32 GB (min)
- **Backup**: automatický, 7-day retention, point-in-time restore
- **Firewall**: allow only Container Apps subnet (VNet integration) nebo Allow Azure Services
- **Database**: `baca`
- **Connection string**: `Host=baca-db.postgres.database.azure.com;Database=baca;Username=baca_admin;Password={secret};SSL Mode=Require`

### Docker — lokální vývoj

```yaml
# docker-compose.yml (pro lokální dev)
services:
  db:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: baca
      POSTGRES_USER: baca_admin
      POSTGRES_PASSWORD: dev_password
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "5000:8080"
    environment:
      - ConnectionStrings__Default=Host=db;Database=baca;Username=baca_admin;Password=dev_password
      - Smtp__Host=mailhog
      - Smtp__Port=1025
      - Auth__Secret=dev-secret-min-32-chars-long-here
      - App__BaseUrl=http://localhost:3000
      - Azure__Speech__Key=${AZURE_SPEECH_KEY}
      - Azure__Speech__Region=westeurope
      - Anthropic__ApiKey=${ANTHROPIC_API_KEY}
      - Anthropic__Model=claude-haiku-4-5-20251001
      - Twilio__AccountSid=${TWILIO_ACCOUNT_SID}
      - Twilio__AuthToken=${TWILIO_AUTH_TOKEN}
      - Twilio__WhatsAppFrom=whatsapp:+14155238886
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  mailhog:
    image: mailhog/mailhog
    ports:
      - "8025:8025"    # Web UI pro testování emailů
      - "1025:1025"

volumes:
  pgdata:
```

---

## CI/CD — GitHub Actions

### Repozitář

- **URL**: `github.com/tomasXYZ/baca` (public, MIT licence)
- **Branch strategie**: `main` (production) + feature branches + PR review
- **Ochrana main**: require PR, require passing CI, no direct push

### Pipeline overview

```
push/PR → lint → test (backend) → test (frontend) → build Docker → push to ACR → deploy to Azure
```

### Workflow: `.github/workflows/ci.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: bacacr.azurecr.io

jobs:
  # ── Backend ──────────────────────────────
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: baca_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.0.x' }
      - run: dotnet restore
        working-directory: backend
      - run: dotnet build --no-restore
        working-directory: backend
      - run: dotnet test --no-build --verbosity normal --collect:"XPlat Code Coverage"
        working-directory: backend
        env:
          ConnectionStrings__Default: "Host=localhost;Database=baca_test;Username=test;Password=test"
      - uses: codecov/codecov-action@v4  # coverage reporting (volitelné)

  # ── Frontend ─────────────────────────────
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
        working-directory: frontend
      - run: npm run lint
        working-directory: frontend
      - run: npm run test -- --coverage
        working-directory: frontend
      - run: npx playwright install --with-deps
        working-directory: frontend
      - run: npm run test:e2e
        working-directory: frontend

  # ── Build & Deploy (jen main) ────────────
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [backend-test, frontend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - uses: azure/docker-login@v2
        with:
          login-server: bacacr.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
      - run: |
          docker build -t $REGISTRY/baca-api:${{ github.sha }} ./backend
          docker build -t $REGISTRY/baca-web:${{ github.sha }} ./frontend
          docker push $REGISTRY/baca-api:${{ github.sha }}
          docker push $REGISTRY/baca-web:${{ github.sha }}
      - run: |
          az containerapp update -n baca-api -g baca-rg \
            --image $REGISTRY/baca-api:${{ github.sha }}
          az containerapp update -n baca-web -g baca-rg \
            --image $REGISTRY/baca-web:${{ github.sha }}
```

### GitHub Secrets (Settings → Secrets)

```
AZURE_CREDENTIALS          # Service Principal JSON
ACR_USERNAME               # Container Registry username
ACR_PASSWORD               # Container Registry password
```

### Azure setup skript (jednorázový)

```bash
# Spustit jednou pro vytvoření infrastruktury
az group create -n baca-rg -l westeurope
az acr create -n bacacr -g baca-rg --sku Basic
az postgres flexible-server create -n baca-db -g baca-rg \
  --sku-name Standard_B1ms --storage-size 32 \
  --admin-user baca_admin --admin-password <password> \
  --database-name baca
az containerapp env create -n baca-env -g baca-rg -l westeurope
# ... container apps, secrets, domain setup
```

---

## Testovací strategie

### Filosofie

Testy musí zaručit, že deploy na produkci je bezpečný. Žádný merge do `main` bez zeleného CI. Pokrytí cílíme na **80%+ backend, 70%+ frontend komponent, 100% kritických E2E cest**.

### Backend — xUnit

**Projektová struktura:**
```
backend/
├── Baca.Api/                     # hlavní projekt
├── Baca.Api.Tests/               # unit testy
│   ├── Services/
│   │   ├── AuthServiceTests.cs
│   │   ├── DashboardServiceTests.cs
│   │   ├── VoiceParsingServiceTests.cs
│   │   └── WhatsAppNotificationServiceTests.cs
│   ├── Endpoints/
│   │   └── ... (unit testy endpoint handlerů)
│   └── Helpers/
│       └── TestFixtures.cs
└── Baca.Api.IntegrationTests/    # integration testy
    ├── BacaWebApplicationFactory.cs
    ├── AuthFlowTests.cs
    ├── TaskCrudTests.cs
    ├── TaskDragDropTests.cs
    ├── VoiceEndpointTests.cs
    ├── AuthorizationMatrixTests.cs  # ← kritické
    └── FocusEndpointTests.cs
```

**Unit testy** (izolované, mockované závislosti):
- `AuthServiceTests`: generování tokenů, verifikace, expirace, neplatné tokeny, guest PIN hashing.
- `DashboardServiceTests`: správný výpočet statistik, overdue počty, progress per kategorie.
- `VoiceParsingServiceTests`: mock Claude API → ověření parsování JSON odpovědi, handling chyb, confidence thresholds, fuzzy matching uživatelů.
- `WhatsAppNotificationServiceTests`: mock Twilio → zpráva odeslána správnému číslu, neposílá při self-assign, neposílá bez telefonu, formát zprávy.
- `TaskSortingTests`: správné řazení Focus endpointu (priorita → due date), max 3 výsledky.

**Integration testy** (WebApplicationFactory + test PostgreSQL):
- `AuthFlowTests`: celý flow — request link → verify token → cookie nastavena → /me vrací uživatele. Guest PIN flow. Expirovaný token. Použitý token.
- `TaskCrudTests`: vytvoření → čtení → update → delete. Subtasky. Cascade delete.
- `TaskDragDropTests`: PATCH status → ověření nového stavu + sortOrder. Souběžné přesuny.
- `AuthorizationMatrixTests`: **pro KAŽDÝ endpoint** ověřit, že Guest/User/Admin mají správný přístup. Generovat testy dynamicky z matice rolí. Toto je nejdůležitější test suite — regresi v auth nikdy nechceme.
- `FocusEndpointTests`: vrací max 3, jen Open/InProgress, správné řazení, pouze úkoly aktuálního uživatele.
- `VoiceEndpointTests`: mock Azure Speech + mock Claude → end-to-end flow transkripce + parsování.

**NuGet testovací balíčky:**
```xml
<PackageReference Include="xunit" Version="2.*" />
<PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.*" />
<PackageReference Include="NSubstitute" Version="5.*" />
<PackageReference Include="FluentAssertions" Version="7.*" />
<PackageReference Include="Testcontainers.PostgreSql" Version="4.*" />
<PackageReference Include="Bogus" Version="35.*" />
<PackageReference Include="coverlet.collector" Version="6.*" />
```

**Testcontainers**: integration testy spouští skutečný PostgreSQL v Dockeru — žádný in-memory fake.

### Frontend — Vitest + React Testing Library

**Projektová struktura:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── board/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskCard.test.tsx          ← component test
│   │   │   ├── KanbanBoard.tsx
│   │   │   └── KanbanBoard.test.tsx
│   │   ├── focus/
│   │   │   ├── FocusPage.tsx
│   │   │   └── FocusPage.test.tsx
│   │   ├── voice/
│   │   │   ├── VoiceTaskPreview.tsx
│   │   │   └── VoiceTaskPreview.test.tsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.test.tsx
│   │   └── admin/
│   │       └── UserManagement.test.tsx
│   ├── hooks/
│   │   ├── useTasks.test.ts
│   │   └── useVoiceRecorder.test.ts
│   └── utils/
│       └── helpers.test.ts
├── e2e/                                    ← Playwright testy
│   ├── auth.spec.ts
│   ├── board.spec.ts
│   ├── focus.spec.ts
│   ├── voice.spec.ts
│   ├── admin.spec.ts
│   └── mobile.spec.ts
└── vitest.config.ts
```

**Component testy** (Vitest + RTL):
- `TaskCard.test.tsx`: renderuje title, kategorie badge, priority indikátor, avatar, overdue styling, "Vezmu si to" tlačítko viditelné jen bez assignee, skryté pro Guest.
- `KanbanBoard.test.tsx`: 5 sloupců renderováno, karty ve správných sloupcích, filtrování funguje.
- `FocusPage.test.tsx`: zobrazí max 3 úkoly, správné řazení, "Hotovo" a "K review" tlačítka, prázdný stav.
- `VoiceTaskPreview.test.tsx`: zobrazí parsovaná pole, žluté zvýraznění pro nízkou confidence, editace polí, submit volá API.
- `Dashboard.test.tsx`: statistiky se renderují, progress bary, overdue count.
- `UserManagement.test.tsx`: tabulka uživatelů, přidání, deaktivace, role změna.

**Hook testy:**
- `useTasks.test.ts`: fetch, cache invalidation, optimistické updaty při drag-and-drop.
- `useVoiceRecorder.test.ts`: state machine (idle → recording → processing → done → idle).

**NPM testovací balíčky:**
```json
{
  "devDependencies": {
    "vitest": "^3.*",
    "@testing-library/react": "^16.*",
    "@testing-library/jest-dom": "^6.*",
    "@testing-library/user-event": "^14.*",
    "msw": "^2.*",
    "@playwright/test": "^1.*"
  }
}
```

**MSW (Mock Service Worker)**: component testy mockují API na úrovni network requestů — žádné mockování fetch přímo.

### E2E — Playwright

**Kritické cesty (musí projít vždy):**

| Test | Co ověřuje |
|------|-----------|
| `auth.spec.ts` | Magic link flow (mock email), guest PIN login, logout, expired token redirect |
| `board.spec.ts` | Vytvoření úkolu, drag-and-drop změna stavu, filtrování, "Vezmu si to" |
| `focus.spec.ts` | Zobrazení top úkolů, "Hotovo" tlačítko změní stav, prázdný stav |
| `voice.spec.ts` | Nahrávání (mock MediaRecorder), náhled parsovaného úkolu, editace, uložení |
| `admin.spec.ts` | Přidání uživatele, změna role, přidání kategorie, smazání prázdné kategorie |
| `mobile.spec.ts` | Focus jako default page @ 375px, spodní tab bar, FAB mikrofon, touch-friendly tlačítka |

**Playwright konfigurace:**
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Tři prohlížečové konfigurace**: desktop Chrome, mobile Android (Pixel 7), mobile iOS (iPhone 14). Mobil je kritický — většina uživatelů bude v lese na telefonu.

---

## Offline režim

### Architektura

**Service Worker** (Workbox) + **IndexedDB** (via `idb` knihovna) pro offline-first Focus stránku a cached "moje úkoly".

### Co funguje offline

| Funkce | Offline chování |
|--------|----------------|
| Focus stránka (moje top 3) | ✅ Plně funkční z IndexedDB cache |
| Moje přiřazené úkoly | ✅ Čtení z cache |
| Označit úkol jako "Hotovo" | ✅ Queued → sync po připojení |
| Přesunout do "For Review" | ✅ Queued → sync po připojení |
| Kanban board (všechny úkoly) | ⚠️ Zobrazí naposledy cachovaná data, read-only |
| Dashboard | ⚠️ Zobrazí naposledy cachované statistiky |
| Vytváření nových úkolů | ❌ Vyžaduje server (ID generování, validace) |
| Hlasový vstup | ❌ Vyžaduje Azure Speech + Claude API |
| Drag-and-drop na boardu | ❌ Offline — příliš složitá conflict resolution |
| Admin stránky | ❌ Pouze online |

### Implementace

**1. Service Worker (Workbox):**
```
- Static assets: Cache-first (JS, CSS, fonty, ikony)
- API /api/focus: Stale-while-revalidate (serve cached, fetch fresh in background)
- API /api/tasks?assignee=me: Stale-while-revalidate
- API /api/dashboard: Stale-while-revalidate
- Ostatní API: Network-only
```

**2. IndexedDB schéma:**
```
baca-offline/
├── tasks          # moje přiřazené úkoly (sync při každém online fetchi)
├── categories     # seznam kategorií (pro zobrazení štítků)
├── users          # seznam uživatelů (pro avatary)
└── pendingActions # fronta offline akcí k synchronizaci
```

**3. Offline action queue:**
```typescript
interface PendingAction {
  id: string;          // UUID
  type: 'STATUS_CHANGE';
  taskId: number;
  payload: { status: 'Done' | 'ForReview' };
  createdAt: string;   // ISO timestamp
  retryCount: number;
}
```

**4. Sync strategie:**
- Při obnovení připojení (`navigator.onLine` event) → zpracuj frontu `pendingActions` sekvenčně.
- Pokud server odpoví 409 Conflict (úkol byl mezitím změněn) → zobraz uživateli dialog "Úkol byl změněn někým jiným" s volbou: přepsat / zahodit moji změnu.
- Po úspěšném syncu → smaž akci z fronty, refresh cache.
- Max 3 retry pokusy, pak oznámit uživateli.

**5. UI indikátory:**
- **Offline banner**: žlutý pruh nahoře "📡 Offline režim — změny se synchronizují po připojení" (sticky, neskrývatelný).
- **Pending badge**: na Focus kartách, které mají čekající offline akci → malý oranžový indikátor "čeká na sync".
- **Sync v průběhu**: spinner v headeru při synchronizaci.
- **Sync hotovo**: zelený toast "✅ Změny synchronizovány".

**6. Cache invalidation:**
- Při každém online page load → fetch fresh data, update IndexedDB.
- Cache TTL: žádný hard limit (vždy stale-while-revalidate).
- Při logoutu → vymazat celý IndexedDB (bezpečnost).

### NPM balíčky pro offline
```json
{
  "dependencies": {
    "workbox-precaching": "^7.*",
    "workbox-routing": "^7.*",
    "workbox-strategies": "^7.*",
    "idb": "^8.*"
  }
}
```

---

## Hlasový vstup — implementační detail

### Audio pipeline (frontend → backend)
1. Frontend: `MediaRecorder` API, formát `audio/webm;codecs=opus` (nebo `audio/wav` jako fallback).
2. Po zastavení nahrávání → `POST /api/voice/transcribe` jako `multipart/form-data`.
3. Backend konvertuje na formát podporovaný Azure Speech (WAV PCM 16kHz) pokud třeba.
4. Azure Speech Services: jazyk `cs-CZ`, single-shot recognition.
5. Transkripce → `POST /api/voice/parse` interně (nebo zřetězené v jednom requestu).

### Claude Haiku 4.5 — prompt pro parsování

System prompt pro `VoiceParsingService`:

```
Jsi asistent pro parsování hlasově zadaných úkolů v českém jazyce.
Dostaneš přepis hlasového vstupu a seznam existujících uživatelů a kategorií.
Tvým úkolem je extrahovat strukturovaná data pro vytvoření úkolu.

Pravidla:
- Title: stručný, akční popis úkolu (max 100 znaků). Odstraň zbytečná slova.
- Assignee: porovnej jméno z přepisu se seznamem uživatelů. Fuzzy match
  (Honzík → Honza, Peťa → Petr). Pokud nenajdeš shodu, nech null.
- Category: porovnej s existujícími kategoriemi. Klíčová slova:
  jídlo/vaření/kuchyň → Jídlo, lano/stan/materiál → Logistika, atd.
- Priority: "urgentní/důležité/asap/hned" → High, "když bude čas/někdy/nice to have"
  → Low, jinak Medium.
- DueDate: relativní výrazy ("do pátku", "příští týden", "do konce dubna")
  převeď na ISO datum. Dnešní datum dostaneš v kontextu.
- Status: vždy "Open" pokud není řečeno jinak.
- Description: cokoliv navíc co se nevešlo do title.

Pro každé pole vrať confidence (0.0–1.0):
- 1.0 = explicitně řečeno
- 0.7–0.9 = odvozeno s vysokou jistotou
- 0.3–0.6 = hádání, fuzzy match
- 0.0 = nebylo zmíněno, default hodnota

Odpověz POUZE validním JSON, bez dalšího textu.
```

User prompt šablona:

```
Dnešní datum: {today}

Existující uživatelé:
{users jako JSON array: [{id, name}]}

Existující kategorie:
{categories jako JSON array: [{id, name}]}

Přepis hlasového vstupu:
"{transcription}"
```

### Confidence thresholds v UI
| Confidence | Vizuální indikátor |
|-----------|-------------------|
| ≥ 0.8 | Normální (bez zvýraznění) |
| 0.5–0.79 | Žluté pozadí pole (zkontroluj) |
| < 0.5 | Červený okraj + ikona varování |
| null/0.0 | Pole prázdné, uživatel musí vyplnit |

### NuGet balíčky pro voice a STT
```xml
<PackageReference Include="Microsoft.CognitiveServices.Speech" Version="1.*" />
<PackageReference Include="Anthropic.SDK" Version="*" />
```

### Hlavní NuGet balíčky (Baca.Api.csproj)
```xml
<!-- EF Core + PostgreSQL -->
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.*" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.*" />
<!-- Auth -->
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.*" />
<!-- External services -->
<PackageReference Include="Microsoft.CognitiveServices.Speech" Version="1.*" />
<PackageReference Include="Anthropic.SDK" Version="*" />
<PackageReference Include="Twilio" Version="7.*" />
```

---

## WhatsApp notifikace (Twilio)

### Kdy se posílá
- **Přiřazení úkolu** — kdykoli se změní `AssigneeId` úkolu na konkrétního uživatele (admin přiřadí, nebo "Vezmu si to" self-assign).
- Neposílá se pokud uživatel nemá vyplněný telefon.
- Neposílá se pokud si uživatel přiřadí sám sobě ("Vezmu si to" → bez notifikace).

### Formát zprávy
```
📋 *Nový úkol pro tebe*

*{task.Title}*
Kategorie: {category.Name}
Priorita: {priority}
Termín: {dueDate ?? "neurčen"}

Přiřadil: {assignedBy.Name}

🔗 {baseUrl}/board?task={task.Id}
```

### Implementace
```csharp
// WhatsAppNotificationService.cs
public class WhatsAppNotificationService
{
    // Twilio SDK: TwilioClient.Init(accountSid, authToken)
    // MessageResource.Create(
    //     to: new PhoneNumber($"whatsapp:{user.Phone}"),
    //     from: new PhoneNumber($"whatsapp:{twilioFrom}"),
    //     body: formattedMessage
    // )
    // Fire-and-forget (neblokuje UI), logování chyb
}
```

### NuGet balíček
```xml
<PackageReference Include="Twilio" Version="7.*" />
```

### Sandbox vs. Production
- **Development**: Twilio Sandbox — uživatelé musí poslat "join <keyword>" na sandbox číslo.
- **Production**: registrovaný Twilio WhatsApp sender (vyžaduje schválení Meta Business, 1–2 týdny).
- Konfigurovatelné přes env var `Twilio__WhatsAppFrom`.

---

## Budoucí rozšíření (v2+)

- [ ] Přílohy souborů u úkolů (Azure Blob Storage)
- [ ] Aktivitní log (kdo kdy co změnil)
- [ ] Export do CSV/Excel
- [ ] Opakující se úkoly / šablony pro příští ročník
- [ ] WhatsApp notifikace i při komentářích a overdue
- [ ] Tmavý režim
- [ ] In-app notifikace badge (polling nebo WebSocket)
- [ ] Offline: vytváření nových úkolů offline (queue + sync)
- [ ] Offline: drag-and-drop na boardu s conflict resolution
- [ ] PWA: Add to Home Screen, push notifikace

---

## Poznámky pro implementaci

1. **Mobilní priorita**: organizátoři budou appku používat hlavně z telefonu v lese. Touch-friendly drag-and-drop, velké klikací plochy, spodní tab bar.
2. **Offline-first Focus**: Focus stránka musí fungovat i bez signálu. Service Worker + IndexedDB cache je kritická část architektury, ne afterthought.
3. **Jednoduchost**: cílem je, aby i netechnický organizátor (vedoucí oddílu) zvládl vytvořit úkol a přesunout ho do "Done" bez vysvětlování.
4. **Čeština**: všechny UI texty, error hlášky, emailové šablony, toast zprávy — vše česky.
5. **Magic link email šablona**: krátký, přátelský text. Žádné HTML monstra. Prostě odkaz.
6. **Testy jako gatekeeper**: žádný merge do `main` bez zeleného CI. AuthorizationMatrixTests jsou nejdůležitější — regresi v oprávněních nikdy nechceme.
7. **EF Core migrations**: `dotnet ef migrations add <Name>` → commit do repa. CI pipeline spouští `dotnet ef database update` před testy.
8. **Secrets management**: lokálně přes `dotnet user-secrets` nebo `.env` file (gitignored). V Azure přes Container Apps secrets. Nikdy necommitovat klíče.
9. **Testcontainers**: integration testy běží proti skutečnému PostgreSQL v Dockeru — žádný in-memory fake. Vyžaduje Docker na CI runneru (GitHub Actions ho má).
10. **Estimated monthly cost**: ~$23/měsíc (Container Apps ~$5 + PostgreSQL ~$13 + ACR ~$5). Při scale-to-zero mimo sezónu ještě méně.

---
---

# ČÁST 2: IMPLEMENTAČNÍ PLÁN

## Overview

This document defines the implementation order, agent boundaries, and prompts for building Bača using Claude Code agents running in parallel terminals. The goal is zero file conflicts between parallel agents, tests baked into every phase, and a final hardening pass.

**Důležité — curse of instructions:** Výzkum ukazuje, že s rostoucím počtem instrukcí klesá schopnost modelu je všechny dodržet. Každý agent prompt je záměrně dlouhý (200+ řádků), protože pokrývá celý scope. Agent by měl:
1. Přečíst celý prompt a pochopit svůj scope a hranice.
2. Pracovat iterativně — jeden endpoint/komponenta/test najednou.
3. Po každém kroku: build, test, commit.
4. Při nejistotě se vrátit k promptu a ověřit scope.
Nepřetěžovat se snahou implementovat vše najednou.

**Phases:**
```
Phase 0 (Foundation)     → single agent, must complete first
    ↓
Phase 1 (Parallel Build) → Agents A, B, C, D — simultaneous
    ↓
Phase 2 (Integration)    → single agent, merges + E2E tests
    ↓
Phase 2b (User Guide)   → docs agent, generates concise guide from live code
    ↓
Phase 3 (Hardening)      → testing agent, coverage + edge cases
```

**Branch strategy:**
```
main (protected)
├── phase-0/foundation        → PR → main
├── phase-1/backend-core      → Agent A → PR → main
├── phase-1/backend-services  → Agent B → PR → main
├── phase-1/frontend-core     → Agent C → PR → main
├── phase-1/frontend-advanced → Agent D → PR → main
├── phase-2/integration       → PR → main
├── phase-2b/user-guide       → PR → main
└── phase-3/hardening         → PR → main
```

**Merge order for Phase 1:** A first (backend core), then B (backend services), then C (frontend core), then D (frontend advanced). Each PR rebases on main after the previous merge.

---

## Phase 0 — Foundation

**Agent:** Single Claude Code agent
**Branch:** `phase-0/foundation`
**Duration:** ~1 session
**Depends on:** Nothing (first to run)
**Must complete before:** ALL other phases

### Agent Prompt

```
You are building the foundation skeleton for "Bača" — a task tracker web app for organizing a LARP event. Your job is to create the project structure, all shared contracts (models, DTOs, TypeScript types), and interface stubs that four parallel agents will build against.

## Project Spec

Read the full specification from: baca-project-spec.md (attached or in working directory).

## Your scope — ONLY these things:

### Backend (C# .NET 10)

1. Create solution structure:
   - `backend/Baca.Api.sln`
   - `backend/Baca.Api/Baca.Api.csproj` (all NuGet packages from spec)
   - `backend/Baca.Api.Tests/Baca.Api.Tests.csproj` (xUnit, NSubstitute, FluentAssertions, Bogus)
   - `backend/Baca.Api.IntegrationTests/Baca.Api.IntegrationTests.csproj` (xUnit, Microsoft.AspNetCore.Mvc.Testing, Testcontainers.PostgreSql, FluentAssertions)

2. EF Core models — ALL of them, fully defined with data annotations and relationships:
   - `Models/User.cs` (with Role enum + nullable GameRoleId FK)
   - `Models/TaskItem.cs` (avoid naming collision with System.Threading.Tasks.Task — use TaskItem or BacaTask)
   - `Models/Comment.cs`
   - `Models/Category.cs`
   - `Models/GameRole.cs` (herní role — Name, Description, Color, SortOrder)
   - `Models/LoginToken.cs`
   - `Models/AppSettings.cs`
   - `Models/Enums.cs` (TaskStatus, Priority, UserRole)

3. `Data/BacaDbContext.cs` — full DbContext with all DbSets, relationships configured in OnModelCreating, indexes on frequently queried fields (Status, AssigneeId, ParentTaskId).

4. Initial EF Core migration: `dotnet ef migrations add InitialCreate`

5. ALL DTOs (in `DTOs/` folder):
   - `TaskDto.cs`, `TaskDetailDto.cs` (includes subtasks + comments)
   - `CreateTaskRequest.cs`, `UpdateTaskRequest.cs`
   - `StatusChangeRequest.cs`, `SortChangeRequest.cs`
   - `CommentDto.cs`, `CreateCommentRequest.cs`
   - `CategoryDto.cs`, `CreateCategoryRequest.cs`, `UpdateCategoryRequest.cs`
   - `GameRoleDto.cs`, `CreateGameRoleRequest.cs`, `UpdateGameRoleRequest.cs`
   - `UserDto.cs`, `CreateUserRequest.cs`, `UpdateUserRequest.cs`
   - `LoginRequest.cs`, `GuestLoginRequest.cs`, `AuthResponse.cs`
   - `VoiceParseResponse.cs` (with confidence fields)
   - `DashboardDto.cs` (stats, per-category progress)
   - `FocusTaskDto.cs`
   - `HealthResponse.cs`
   - `AppSettingsDto.cs`, `UpdateSettingsRequest.cs`

6. ALL endpoint files as STUBS (returning 501 Not Implemented):
   - `Endpoints/AuthEndpoints.cs`
   - `Endpoints/TaskEndpoints.cs`
   - `Endpoints/CommentEndpoints.cs`
   - `Endpoints/CategoryEndpoints.cs`
   - `Endpoints/GameRoleEndpoints.cs`
   - `Endpoints/UserEndpoints.cs`
   - `Endpoints/DashboardEndpoints.cs`
   - `Endpoints/FocusEndpoints.cs`
   - `Endpoints/VoiceEndpoints.cs`
   - `Endpoints/SettingsEndpoints.cs`
   - `Endpoints/HealthEndpoints.cs` (this one can be fully implemented — just returns "healthy")
   Each file should define the routes with correct HTTP methods, paths, and parameter types. Map them in an extension method like `app.MapTaskEndpoints()`.

7. ALL service interfaces (in `Services/`):
   - `IAuthService.cs`
   - `IEmailService.cs`
   - `IDashboardService.cs`
   - `IVoiceTranscriptionService.cs`
   - `IVoiceParsingService.cs`
   - `IWhatsAppNotificationService.cs`
   Each with full method signatures matching the spec.

8. `Program.cs`:
   - Register all services as DI (with placeholder implementations that throw NotImplementedException)
   - EF Core + Npgsql registration
   - CORS configuration
   - Map all endpoint groups
   - Health check endpoint
   - Read configuration from environment variables
      - Seed data logic (admin user, default categories, default game roles, guest PIN) — run on startup if DB is empty

9. `Middleware/AuthMiddleware.cs` — stub that just calls next() (Agent A will implement).

10. `BacaWebApplicationFactory.cs` in integration tests project — configured with Testcontainers PostgreSQL, ready to use.

### Frontend (React + TypeScript + Vite)

1. Initialize project:
   - `npm create vite@latest frontend -- --template react-ts`
   - Install ALL dependencies from spec: `@dnd-kit/core`, `@dnd-kit/sortable`, `tailwindcss`, `idb`, `workbox-*`, `react-router-dom`
   - Install ALL dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw`, `@playwright/test`

2. `src/types/index.ts` — ALL TypeScript types mirroring backend DTOs exactly. This is the shared contract. Include:
   - TaskItem, TaskDetail, CreateTaskRequest, UpdateTaskRequest
   - Comment, CreateCommentRequest
   - Category, CreateCategoryRequest, UpdateCategoryRequest
   - GameRole, CreateGameRoleRequest, UpdateGameRoleRequest
   - User, CreateUserRequest, UpdateUserRequest
   - VoiceParseResponse (with confidence fields)
   - DashboardData
   - FocusTask
   - Enums: TaskStatus, Priority, UserRole
   - AppSettings

3. `src/api/client.ts` — API client wrapper:
   - Base URL from env var `VITE_API_URL`
   - Cookie-based auth (credentials: 'include')
   - Generic `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete` methods
   - Error handling (401 → redirect to /login)
   - Typed endpoint functions for EVERY API endpoint from spec

4. `src/App.tsx` with React Router:
   - All routes from spec: `/login`, `/`, `/dashboard`, `/board`, `/board/user`, `/voice`, `/admin/users`, `/admin/categories`, `/admin/gameroles`, `/admin/settings`
   - Auth guard (redirect to /login if not authenticated)
   - Responsive routing: mobile (< 768px) → `/` renders FocusPage, desktop → `/` renders Dashboard
   - All pages rendering placeholder `<div>Page: {name} — Not implemented yet</div>`

5. `vitest.config.ts` — configured for React, jsdom environment
6. `playwright.config.ts` — 3 projects (desktop Chrome, Pixel 7, iPhone 14)
7. `tailwind.config.js` — configured with custom colors from spec (status colors, forest green header)

8. MSW setup:
   - `src/mocks/handlers.ts` — mock handlers for ALL API endpoints (returning sensible test data)
   - `src/mocks/server.ts` — MSW server for Vitest
   - `src/mocks/browser.ts` — MSW worker for development

### Infrastructure

1. `docker-compose.yml` — PostgreSQL + Mailhog (from spec)
2. `.github/workflows/ci.yml` — CI pipeline skeleton (build only, no tests yet — agents will add test steps)
3. `README.md` — setup instructions, architecture overview
4. `.gitignore` — standard .NET + Node + IDE ignores
5. `LICENSE` — MIT

## CRITICAL RULES:
- Do NOT implement any business logic. Endpoints return 501, services throw NotImplementedException.
- Do NOT skip any DTO or type. Every single field from the spec must be present.
- Do NOT use `Task` as a model name — use `TaskItem` to avoid collision with System.Threading.Tasks.Task.
- The TypeScript types in `types/index.ts` MUST exactly mirror the C# DTOs. Same field names (camelCase in TS, PascalCase in C# — the JSON serializer handles conversion).
- The API client functions in `client.ts` MUST cover every endpoint from the spec.
- ALL endpoint stubs must have the correct route, HTTP method, request type, and response type — even though the body is just `return Results.StatusCode(501)`.

## Definition of done:
- `dotnet build` succeeds
- `dotnet ef database update` succeeds against local PostgreSQL
- `npm run build` succeeds
- `npm run dev` starts and all routes render placeholder pages
- `docker-compose up` starts PostgreSQL + Mailhog
- All files from the project structure in the spec exist

## After completion:
Commit everything, push to `phase-0/foundation`, create PR → main. Merge immediately (this is the foundation everything else builds on).
```

---

## Phase 1 — Parallel Build

### Agent A — Backend Core

**Branch:** `phase-1/backend-core` (branched from main after Phase 0 merge)
**Depends on:** Phase 0 merged into main
**Parallel with:** Agents B, C, D

### Agent A Prompt

```
You are implementing the core backend logic for "Bača" — a task tracker web app. The project skeleton, all models, DTOs, interfaces, and endpoint stubs already exist (created in Phase 0). Your job is to implement the business logic for auth, tasks, comments, and focus.

## Tissaia Skill

Use the **`tinkerer`** skill as your working methodology: `/tissaia install tinkerer`. Follow its workflow — read existing code, match patterns, build frequently, write basic tests, escalate architectural decisions.

## Project Spec

Read the full specification from: baca-project-spec.md

## Your file ownership — ONLY touch these files:

### Implement (replace stubs with real logic):
- `Endpoints/AuthEndpoints.cs`
- `Endpoints/TaskEndpoints.cs`
- `Endpoints/CommentEndpoints.cs`
- `Endpoints/FocusEndpoints.cs`
- `Services/AuthService.cs` (implement IAuthService)
- `Services/EmailService.cs` (implement IEmailService)
- `Middleware/AuthMiddleware.cs`

### Create new:
- `Baca.Api.Tests/Services/AuthServiceTests.cs`
- `Baca.Api.Tests/Services/TaskSortingTests.cs`
- `Baca.Api.IntegrationTests/AuthFlowTests.cs`
- `Baca.Api.IntegrationTests/TaskCrudTests.cs`
- `Baca.Api.IntegrationTests/TaskDragDropTests.cs`
- `Baca.Api.IntegrationTests/FocusEndpointTests.cs`
- `Baca.Api.IntegrationTests/AuthorizationMatrixTests.cs`

### You may modify (minimally):
- `Program.cs` — only to register YOUR services with real implementations (replace NotImplementedException registrations). Do NOT change the structure or other service registrations.

## DO NOT TOUCH:
- Any file in `Endpoints/` other than Auth, Task, Comment, Focus (GameRole belongs to Agent B)
- Any service file other than AuthService, EmailService
- Any frontend file
- Models, DTOs, DbContext (these are frozen contracts from Phase 0)
- docker-compose.yml, CI pipeline, project files

## Implementation details:

### Auth system:
- Magic link: generate GUID token, store in LoginToken table, send via IEmailService
- Token verification: lookup token, check expiry + IsUsed, mark used, create session cookie (httpOnly, Secure, SameSite=Lax, 30 days)
- Guest PIN: hash with BCrypt, compare on login, set guest cookie (limited role)
- AuthMiddleware: read cookie, lookup user, set HttpContext.Items["User"] and HttpContext.Items["Role"]
- Use cookie-based auth (NOT JWT) — simpler for this use case

### Task endpoints:
- Full CRUD with authorization checks
- PATCH /status: update status + sortOrder, trigger WhatsApp notification via IWhatsAppNotificationService (just call the interface — Agent B implements it)
- PATCH /assign-me: set AssigneeId to current user, do NOT trigger WhatsApp (self-assign)
- GET with filtering: status, categoryId, assigneeId, search (ILIKE on title), parentTaskId
- DELETE: cascade delete subtasks and their comments
- SortOrder management: when a task moves to a new column, insert at the specified position and shift others

### Focus endpoint:
- GET /api/focus: return top 3 tasks where AssigneeId == current user AND Status IN (Open, InProgress)
- Sort: Priority DESC (High first), then DueDate ASC (nearest first, nulls last)

### Comment endpoints:
- GET: return comments for a task, ordered by CreatedAt ASC
- POST: create comment, set AuthorId to current user

## Testing requirements:

### Unit tests (mock all dependencies):
- `AuthServiceTests`:
  - GenerateToken → stores in DB, returns token string
  - VerifyToken_Valid → returns user, marks token used
  - VerifyToken_Expired → returns null
  - VerifyToken_AlreadyUsed → returns null
  - VerifyGuestPin_Correct → returns true
  - VerifyGuestPin_Wrong → returns false
- `TaskSortingTests`:
  - FocusSort_PriorityFirst → High before Medium before Low
  - FocusSort_DueDateSecond → nearest date first within same priority
  - FocusSort_NullDueDateLast → tasks without due date come last
  - FocusSort_MaxThree → never returns more than 3

### Integration tests (WebApplicationFactory + Testcontainers PostgreSQL):
- `AuthFlowTests`:
  - RequestLink_ValidEmail → 200, token created in DB
  - RequestLink_UnknownEmail → 404
  - VerifyToken_Valid → sets cookie, redirects
  - VerifyToken_Expired → 401
  - GuestLogin_CorrectPin → sets guest cookie
  - GuestLogin_WrongPin → 401
  - Logout → clears cookie
  - Me_Authenticated → returns user
  - Me_Unauthenticated → 401

- `TaskCrudTests`:
  - CreateTask → 201, task in DB
  - GetTask → includes subtasks and comments
  - UpdateTask → fields updated
  - DeleteTask → cascades subtasks
  - CreateSubtask → ParentTaskId set correctly
  - FilterByStatus → only matching tasks returned
  - FilterByAssignee → only assigned tasks returned
  - SearchByTitle → ILIKE match works
  - ChangeStatus → status updated, sortOrder adjusted

- `TaskDragDropTests`:
  - MoveToNewColumn → status changes, sortOrder set
  - ReorderInColumn → sortOrder updated, others shifted
  - ConcurrentMoves → no data corruption

- `FocusEndpointTests`:
  - ReturnsMax3 → never more than 3 tasks
  - OnlyOpenAndInProgress → excludes Idea, ForReview, Done
  - OnlyMyTasks → excludes tasks assigned to others
  - SortedByPriorityThenDueDate → correct order
  - EmptyWhenNoTasks → returns empty array

- `AuthorizationMatrixTests` — THIS IS THE MOST IMPORTANT TEST FILE:
  - Generate tests programmatically for EVERY endpoint × EVERY role
  - Use [Theory] + [MemberData] to create a matrix
  - For each combination, verify: Guest gets 403 on write endpoints, User gets 403 on admin endpoints, Admin gets 200 on everything
  - Test the EXACT matrix from the spec:
    - GET /api/* → Guest ✅, User ✅, Admin ✅
    - GET /api/focus → Guest ❌, User ✅, Admin ✅
    - POST/PUT/PATCH/DELETE /api/tasks/* → Guest ❌, User ✅, Admin ✅
    - POST /api/tasks/*/comments → Guest ❌, User ✅, Admin ✅
    - POST /api/voice/* → Guest ❌, User ✅, Admin ✅
    - /api/categories (write) → Guest ❌, User ❌, Admin ✅
    - /api/users/* → Guest ❌, User ❌, Admin ✅
    - /api/settings (write) → Guest ❌, User ❌, Admin ✅

## Definition of done:
- All endpoint stubs replaced with real implementations
- All tests pass: `dotnet test` green
- Auth flow works end-to-end against local PostgreSQL
- AuthorizationMatrix covers every endpoint × role combination

## IMPORTANT:
- When calling IWhatsAppNotificationService.NotifyTaskAssigned(), just call the interface method. Agent B will provide the implementation. For tests, mock it.
- When calling IEmailService.SendMagicLink(), implement a real SMTP sender using the config from appsettings. For tests, mock it.
- Use BCrypt.Net-Next for password/PIN hashing (add NuGet if not present).
```

---

### Agent B — Backend Services

**Branch:** `phase-1/backend-services` (branched from main after Phase 0 merge)
**Depends on:** Phase 0 merged into main
**Parallel with:** Agents A, C, D

### Agent B Prompt

```
You are implementing the backend services and admin endpoints for "Bača" — a task tracker web app. The project skeleton, all models, DTOs, interfaces, and endpoint stubs already exist (created in Phase 0). Your job is to implement voice processing, WhatsApp notifications, dashboard, and admin CRUD.

## Tissaia Skill

Use the **`tinkerer`** skill as your working methodology: `/tissaia install tinkerer`. Follow its workflow — read existing code, match patterns, build frequently, write basic tests, escalate architectural decisions.

## Project Spec

Read the full specification from: baca-project-spec.md

## Your file ownership — ONLY touch these files:

### Implement (replace stubs with real logic):
- `Endpoints/VoiceEndpoints.cs`
- `Endpoints/DashboardEndpoints.cs`
- `Endpoints/CategoryEndpoints.cs`
- `Endpoints/GameRoleEndpoints.cs`
- `Endpoints/UserEndpoints.cs`
- `Endpoints/SettingsEndpoints.cs`
- `Services/VoiceTranscriptionService.cs` (implement IVoiceTranscriptionService)
- `Services/VoiceParsingService.cs` (implement IVoiceParsingService)
- `Services/WhatsAppNotificationService.cs` (implement IWhatsAppNotificationService)
- `Services/DashboardService.cs` (implement IDashboardService)

### Create new:
- `Baca.Api.Tests/Services/VoiceParsingServiceTests.cs`
- `Baca.Api.Tests/Services/WhatsAppNotificationServiceTests.cs`
- `Baca.Api.Tests/Services/DashboardServiceTests.cs`
- `Baca.Api.IntegrationTests/VoiceEndpointTests.cs`
- `Baca.Api.IntegrationTests/CategoryCrudTests.cs`
- `Baca.Api.IntegrationTests/GameRoleCrudTests.cs`
- `Baca.Api.IntegrationTests/UserManagementTests.cs`
- `Baca.Api.IntegrationTests/DashboardEndpointTests.cs`

### You may modify (minimally):
- `Program.cs` — only to register YOUR services with real implementations. Do NOT change other registrations.

## DO NOT TOUCH:
- Auth, Task, Comment, Focus endpoints (Agent A owns these)
- AuthService, EmailService, AuthMiddleware (Agent A owns these)
- Any frontend file
- Models, DTOs, DbContext (frozen contracts)

## Implementation details:

### Voice transcription (Azure Speech):
- Accept audio as multipart/form-data (webm or wav)
- Convert to PCM WAV 16kHz if needed (use NAudio or FFmpeg)
- Call Azure Speech Services SDK with language "cs-CZ"
- Return transcription string
- Configuration: Azure__Speech__Key, Azure__Speech__Region from env vars

### Voice parsing (Claude Haiku 4.5):
- Accept transcription string + current date
- Fetch all active users and categories from DB (for fuzzy matching context)
- Call Anthropic API with the system prompt from spec
- Parse JSON response into VoiceParseResponse DTO
- Match assignee/category names to IDs (fuzzy: Levenshtein distance or simple Contains)
- Calculate confidence scores
- Configuration: Anthropic__ApiKey, Anthropic__Model from env vars
- Use HttpClient to call Anthropic REST API (or Anthropic.SDK NuGet)

### WhatsApp notification (Twilio):
- Send WhatsApp message when a task is assigned to someone else
- Message format from spec (title, category, priority, due date, link)
- Do NOT send if: user has no phone, or assigner == assignee (self-assign)
- Fire-and-forget (don't block the API response), log errors
- Configuration: Twilio__AccountSid, Twilio__AuthToken, Twilio__WhatsAppFrom from env vars
- Use Twilio SDK NuGet

### Dashboard:
- Aggregate stats: total tasks, count by status, overdue count
- Per-category progress: for each category, count done / total
- Overall progress: done / total as percentage
- Recent changes: last 10 tasks ordered by UpdatedAt DESC
- My tasks count: tasks assigned to current user (non-Done)

### Admin endpoints:
- Categories: CRUD, prevent delete if tasks exist, validate unique name
- Game Roles: CRUD, prevent delete if users assigned, validate unique name. Same pattern as Category.
- Users: CRUD, add phone + gameRoleId fields, prevent delete if tasks assigned (only deactivate), resend magic link (call IEmailService — Agent A implements it, just call the interface)
- Settings: get/update guest PIN (hash with BCrypt) and app name

## Testing requirements:

### Unit tests (mock all dependencies):
- `VoiceParsingServiceTests`:
  - ParseTranscription_ExtractsTitle → correct title extracted
  - ParseTranscription_MatchesAssignee → fuzzy match to existing user
  - ParseTranscription_MatchesCategory → matches to existing category
  - ParseTranscription_ParsesPriority → "urgentní" → High
  - ParseTranscription_ParsesDueDate → "do pátku" → correct date
  - ParseTranscription_HandlesUnknownAssignee → null assigneeId, low confidence
  - ParseTranscription_HandlesMalformedJson → graceful error
  - ParseTranscription_ApiError → throws descriptive exception

- `WhatsAppNotificationServiceTests`:
  - NotifyAssigned_SendsMessage → Twilio called with correct number and body
  - NotifyAssigned_NoPhone → Twilio NOT called
  - NotifyAssigned_SelfAssign → Twilio NOT called
  - NotifyAssigned_TwilioError → logged, not thrown (fire-and-forget)
  - MessageFormat_ContainsAllFields → title, category, priority, due date, link all present

- `DashboardServiceTests`:
  - GetStats_CorrectCounts → task counts by status match
  - GetStats_OverdueCount → only past-due non-Done tasks
  - GetStats_CategoryProgress → correct done/total per category
  - GetStats_EmptyDatabase → returns zeros, no errors

### Integration tests:
- `VoiceEndpointTests`:
  - Transcribe_ValidAudio → 200, transcription returned (mock Azure SDK at HTTP level)
  - Parse_ValidTranscription → 200, VoiceParseResponse with all fields
  - Voice_GuestDenied → 403

- `CategoryCrudTests`:
  - CreateCategory → 201, in DB
  - UpdateCategory → name + color changed
  - DeleteCategory_Empty → 200, deleted
  - DeleteCategory_HasTasks → 409 Conflict
  - DuplicateName → 409 Conflict

- `GameRoleCrudTests`:
  - CreateGameRole → 201, in DB
  - UpdateGameRole → name + color + description changed
  - DeleteGameRole_NoUsers → 200, deleted
  - DeleteGameRole_HasUsers → 409 Conflict
  - DuplicateName → 409 Conflict

- `UserManagementTests`:
  - CreateUser → 201, in DB, magic link sent (mock email service)
  - UpdateUser_ChangeRole → role updated
  - DeactivateUser → IsActive = false
  - DeleteUser_HasTasks → 409 Conflict (can only deactivate)
  - ResendLink → new token created

- `DashboardEndpointTests`:
  - GetDashboard → 200, correct aggregated stats
  - GetDashboard_GuestAllowed → 200 (read-only is fine)

## Definition of done:
- All endpoint stubs replaced with real implementations
- All tests pass: `dotnet test` green
- Voice flow works with mocked Azure/Anthropic in tests
- WhatsApp sends correctly via Twilio sandbox
- Dashboard returns accurate statistics

## IMPORTANT:
- For voice tests, mock the external APIs (Azure Speech, Anthropic). Do NOT call real APIs in CI.
- For WhatsApp tests, mock Twilio. Do NOT send real messages in CI.
- When calling IEmailService from UserEndpoints (resend link), just call the interface — Agent A provides the implementation.
- The AuthMiddleware is implemented by Agent A. Your endpoints will have auth context available via HttpContext.Items["User"] and HttpContext.Items["Role"]. For integration tests, use the WebApplicationFactory helpers to set up authenticated test clients.
```

---

### Agent C — Frontend Core

**Branch:** `phase-1/frontend-core` (branched from main after Phase 0 merge)
**Depends on:** Phase 0 merged into main
**Parallel with:** Agents A, B, D

### Agent C Prompt

```
You are implementing the core frontend UI for "Bača" — a task tracker web app. The project skeleton, all TypeScript types, API client, and route stubs already exist (created in Phase 0). Your job is to build the login page, Kanban board with drag-and-drop, per-user board, focus page, task detail modal, and main layout.

## Tissaia Skill

Use the **`tinkerer`** skill as your working methodology: `/tissaia install tinkerer`. Follow its workflow — read existing code, match patterns, build frequently, write basic tests, escalate architectural decisions.

## Project Spec

Read the full specification from: baca-project-spec.md

## Your file ownership — ONLY touch these files:

### Implement (replace placeholders):
- `src/components/auth/LoginPage.tsx`
- `src/components/board/KanbanBoard.tsx`
- `src/components/board/KanbanColumn.tsx`
- `src/components/board/TaskCard.tsx`
- `src/components/board/TaskDetailModal.tsx`
- `src/components/focus/FocusPage.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/BottomTabBar.tsx`
- `src/components/layout/Layout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/shared/Avatar.tsx`
- `src/components/shared/Badge.tsx`
- `src/components/shared/FilterBar.tsx`
- `src/components/shared/ConfirmDialog.tsx`
- `src/hooks/useTasks.ts`
- `src/hooks/useFocus.ts`
- `src/hooks/useAuth.ts`
- `src/hooks/useDragAndDrop.ts`
- `src/utils/constants.ts`
- `src/utils/helpers.ts`

### Create new (test files):
- `src/components/board/TaskCard.test.tsx`
- `src/components/board/KanbanBoard.test.tsx`
- `src/components/focus/FocusPage.test.tsx`
- `src/components/auth/LoginPage.test.tsx`
- `src/components/layout/BottomTabBar.test.tsx`
- `src/hooks/useTasks.test.ts`
- `src/hooks/useFocus.test.ts`

### You may modify:
- `src/App.tsx` — replace placeholder route components with real ones. Do NOT add new routes.
- `src/main.tsx` — add MSW browser worker initialization for development.

## DO NOT TOUCH:
- `src/components/voice/*` (Agent D)
- `src/components/dashboard/*` (Agent D)
- `src/components/admin/*` (Agent D)
- `src/hooks/useVoiceRecorder.ts` (Agent D)
- `src/hooks/useOnlineStatus.ts` (Agent D)
- `src/offline/*` (Agent D)
- `src/sw.ts` (Agent D)
- `src/types/index.ts` (frozen contract)
- `src/api/client.ts` (frozen contract)
- Any backend file
- `e2e/` folder (Phase 2)

## Implementation details:

### Login page:
- Two tabs/sections: "Organizátor" (email input + "Poslat odkaz" button) and "Host" (PIN input + "Vstoupit" button)
- Email tab: call POST /api/auth/request-link → show success message "Odkaz odeslán na {email}"
- PIN tab: call POST /api/auth/guest → redirect to home on success
- Magic link verification: handled by the route `/auth/verify/:token` which calls GET /api/auth/verify/{token} → redirect to home
- Minimalist design, centered card, app name "Bača" at top
- All text in Czech

### Kanban board (/board):
- 5 columns: Nápad (Idea), Otevřeno (Open), V řešení (In Progress), K revizi (For Review), Hotovo (Done)
- Use @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
- Drag between columns → PATCH /api/tasks/{id}/status
- Drag within column → PATCH /api/tasks/{id}/sort
- Optimistic UI: move the card immediately, revert on API error
- Filter bar at top: category (multi-select), assignee (multi-select), priority (select), search (text input)
- Filter state in URL params for shareability

### Task card:
- Shows: title, category badge (colored), priority indicator (colored dot or icon), assignee avatar (colored circle with initials), due date (red if overdue), subtask count ("2/4"), comment count icon
- "Vezmu si to" button: visible ONLY when task has no assignee AND current user is not Guest. Calls PATCH /api/tasks/{id}/assign-me.
- Click on card → open TaskDetailModal
- Compact on mobile, slightly larger on desktop

### Task detail modal (or side panel):
- All fields editable: title, description (textarea, plain text for v1), status (dropdown), priority (dropdown), category (dropdown), assignee (dropdown), due date (date picker)
- Subtask list: each with status checkbox, title. "Přidat subtask" inline form.
- Comment list: chronological, author avatar + name + time. Input for new comment.
- Read-only mode for Guest (no edit controls)
- Save on field blur or explicit "Uložit" button
- "Smazat úkol" button (Admin/User only, with ConfirmDialog)

### Focus page:
- Fetch from GET /api/focus (max 3 tasks)
- Large cards: title (big font), category badge, priority, due date (red if overdue), subtask progress
- Action buttons on each card: "Hotovo ✓" (green, moves to Done), "K review →" (purple, moves to ForReview)
- Both buttons: optimistic UI, call PATCH /api/tasks/{id}/status
- Empty state: "Všechno splněno! 🎉" with link to board
- This is the mobile default landing page (< 768px viewport)

### Per-user board (/board/user):
- Left sidebar: list of users with colored avatars, clickable
- Click user → filter board to show only their tasks
- "Nepřiřazené" option to show unassigned tasks
- Same 5-column Kanban layout as main board

### Layout:
- Desktop: top Header with nav links (Dashboard, Board, Per User, Hlasový vstup, Admin — admin only), right side: user avatar + "Můj fokus" link + badge with task count
- Mobile: BottomTabBar with 5 tabs (Fokus, Board, Hlas, Dashboard, Admin — admin only), large icons
- Badge on Focus tab showing active task count
- Dark green header (#166534), light background, forest theme

### Shared components:
- Avatar: colored circle with initials, size prop (sm/md/lg)
- Badge: colored pill for categories and status
- FilterBar: horizontal bar with dropdowns and search input
- ConfirmDialog: modal with "Opravdu chcete...?" message, Confirm/Cancel buttons

## Testing requirements (Vitest + React Testing Library):

Use MSW to mock API calls. Import handlers from `src/mocks/handlers.ts`.

- `TaskCard.test.tsx`:
  - Renders title, category, priority, assignee, due date
  - Shows overdue styling for past due dates
  - Shows "Vezmu si to" for unassigned tasks (non-Guest)
  - Hides "Vezmu si to" for Guest
  - Hides "Vezmu si to" when task has assignee
  - Click calls onSelect callback

- `KanbanBoard.test.tsx`:
  - Renders 5 columns with correct Czech names
  - Places tasks in correct columns by status
  - Filter by category shows only matching tasks
  - Filter by search shows only matching tasks
  - Shows loading skeleton while fetching

- `FocusPage.test.tsx`:
  - Shows max 3 tasks
  - "Hotovo" button calls status change API
  - "K review" button calls status change API
  - Shows empty state when no tasks
  - Shows overdue indicator

- `LoginPage.test.tsx`:
  - Email tab: submits email, shows success message
  - PIN tab: submits PIN, redirects on success
  - Shows error on wrong PIN

- `BottomTabBar.test.tsx`:
  - Renders 5 tabs
  - Hides Admin tab for non-admin
  - Shows badge count on Focus tab
  - Highlights active tab

- `useTasks.test.ts`:
  - Fetches tasks, returns typed data
  - Handles filter parameters
  - Invalidates cache on mutation

- `useFocus.test.ts`:
  - Fetches focus tasks
  - Returns max 3 tasks
  - Refetches after status change

## Design system (Tailwind classes):

Status colors (use in constants.ts):
- Idea: bg-gray-100 text-gray-600, border-gray-300
- Open: bg-blue-100 text-blue-600, border-blue-300
- InProgress: bg-amber-100 text-amber-600, border-amber-300
- ForReview: bg-purple-100 text-purple-600, border-purple-300
- Done: bg-green-100 text-green-600, border-green-300

Priority: High = red-500, Medium = amber-500, Low = gray-400

Header: bg-green-900 text-white

Cards: bg-white rounded-lg shadow-sm border border-gray-200 p-3
Focus cards: bg-white rounded-xl shadow-md border border-gray-200 p-4 (larger)

## Definition of done:
- All pages render and function with MSW mock data
- Drag-and-drop works (move between columns, reorder within)
- Focus page shows tasks and action buttons work
- Login flow works (with MSW mocks)
- All component tests pass: `npm run test`
- Mobile layout works at 375px width
- All text is in Czech

## IMPORTANT:
- Use `react-query` (TanStack Query) for data fetching if it makes the caching/invalidation cleaner. Add it as a dependency if needed.
- All API calls go through the shared `src/api/client.ts` — do NOT use raw fetch.
- All types come from `src/types/index.ts` — do NOT create duplicate types.
- Placeholder for the FAB microphone button: render an empty fixed-position div at bottom-right with a mic icon. Agent D will wire it up.
```

---

### Agent D — Frontend Advanced

**Branch:** `phase-1/frontend-advanced` (branched from main after Phase 0 merge)
**Depends on:** Phase 0 merged into main
**Parallel with:** Agents A, B, C

### Agent D Prompt

```
You are implementing the advanced frontend features for "Bača" — a task tracker web app. The project skeleton, types, and API client already exist. Your job is to build the voice input UI, offline support, dashboard, and admin pages.

## Tissaia Skill

Use the **`tinkerer`** skill as your working methodology: `/tissaia install tinkerer`. Follow its workflow — read existing code, match patterns, build frequently, write basic tests, escalate architectural decisions.

## Project Spec

Read the full specification from: baca-project-spec.md

## Your file ownership — ONLY touch these files:

### Implement (replace placeholders):
- `src/components/voice/VoicePage.tsx`
- `src/components/voice/VoiceRecorder.tsx`
- `src/components/voice/VoiceTaskPreview.tsx`
- `src/components/voice/VoiceFab.tsx`
- `src/components/dashboard/Dashboard.tsx`
- `src/components/dashboard/StatsCard.tsx`
- `src/components/dashboard/ProgressChart.tsx`
- `src/components/admin/UserManagement.tsx`
- `src/components/admin/CategoryManagement.tsx`
- `src/components/admin/GameRoleManagement.tsx`
- `src/components/admin/Settings.tsx`
- `src/hooks/useVoiceRecorder.ts`
- `src/hooks/useOnlineStatus.ts`

### Create new:
- `src/offline/db.ts`
- `src/offline/syncQueue.ts`
- `src/offline/offlineIndicator.tsx`
- `src/sw.ts`
- `src/components/voice/VoiceRecorder.test.tsx`
- `src/components/voice/VoiceTaskPreview.test.tsx`
- `src/components/dashboard/Dashboard.test.tsx`
- `src/components/admin/UserManagement.test.tsx`
- `src/components/admin/GameRoleManagement.test.tsx`
- `src/hooks/useVoiceRecorder.test.ts`
- `src/hooks/useOnlineStatus.test.ts`

### You may modify:
- `src/App.tsx` — only to add the VoiceFab component globally and the OfflineIndicator. Do NOT change routes or other components.
- `src/main.tsx` — only to register the service worker.
- `vite.config.ts` — only to add Workbox plugin (vite-plugin-pwa) if needed.
- `package.json` — only to add `vite-plugin-pwa` if not already present.

## DO NOT TOUCH:
- `src/components/board/*` (Agent C)
- `src/components/focus/*` (Agent C)
- `src/components/auth/*` (Agent C)
- `src/components/layout/*` (Agent C)
- `src/hooks/useTasks.ts`, `useFocus.ts`, `useAuth.ts`, `useDragAndDrop.ts` (Agent C)
- `src/types/index.ts` (frozen contract)
- `src/api/client.ts` (frozen contract)
- Any backend file
- `e2e/` folder (Phase 2)

## Implementation details:

### Voice page (/voice):
- Large microphone button center-screen (60%+ width on mobile)
- States: idle → recording (pulsating red) → processing (spinner) → preview → idle
- useVoiceRecorder hook: manages MediaRecorder API, captures audio as Blob
- On stop recording: POST blob to /api/voice/transcribe → then POST transcription to /api/voice/parse
- Show VoiceTaskPreview with parsed fields

### VoiceRecorder component:
- Big circular button with mic icon
- Pulsating animation when recording (CSS keyframes, red glow)
- Click to start, click again to stop
- Show recording duration timer
- "Zrušit" button to discard recording
- Browser permission request for microphone on first use

### VoiceTaskPreview component:
- Shows raw transcription text (gray, smaller)
- Editable form below with parsed fields:
  - Title (text input)
  - Assignee (dropdown of users)
  - Category (dropdown of categories)
  - Priority (select: Vysoká/Střední/Nízká)
  - Due date (date picker)
  - Status (select, default Open)
  - Description (textarea)
- Confidence-based styling:
  - ≥ 0.8: normal (no highlight)
  - 0.5–0.79: yellow background (bg-amber-50 border-amber-300)
  - < 0.5: red border (border-red-400) + warning icon
  - null/0.0: empty field, user must fill
- Buttons: "Uložit úkol" (primary), "Zkusit znovu" (secondary), "Zrušit"
- On save: POST /api/tasks with filled fields → toast "Úkol vytvořen" → reset to idle

### VoiceFab (floating action button):
- Fixed position bottom-right (right-4 bottom-20 on mobile to not overlap tab bar)
- Small mic icon button (56px circle, green)
- Click → open modal/overlay with VoiceRecorder + VoiceTaskPreview
- Hidden for Guest role
- After save → close modal, trigger task list refetch (via query invalidation)

### Dashboard:
- Donut chart: tasks by status (use recharts PieChart)
- Progress bar: overall completion (Done / Total)
- Per-category progress bars
- Overdue count (red badge)
- "Moje úkoly" count for current user
- Recent changes list (last 5-10 tasks, title + status + time)
- Click overdue count → navigate to board filtered by overdue
- All data from GET /api/dashboard

### Admin — User Management:
- Table: name, email, phone, role badge, active status
- "Přidat uživatele" button → form (name, email, phone, role dropdown)
- Edit: inline or modal — change role, phone, deactivate
- "Znovu odeslat odkaz" button per user → POST /api/users/{id}/resend-link
- Cannot deactivate yourself
- Phone field: +420 prefix with validation

### Admin — Category Management:
- List with color swatch and name
- "Přidat kategorii" → form (name, color picker)
- Edit: change name, color
- Delete: only if no tasks (show error if tasks exist)
- Drag-and-drop reorder (use @dnd-kit)

### Admin — Game Role Management:
- List with color swatch, name, and description
- "Přidat herní roli" → form (name, description, color picker)
- Edit: change name, description, color
- Delete: only if no users assigned (show error if users exist)
- Drag-and-drop reorder (use @dnd-kit)
- Same UI pattern as Category Management

### Admin — Settings:
- Change guest PIN (input + save button)
- App name (input + save button)
- Simple form, minimal UI

### Offline support:
- `src/offline/db.ts`:
  - IndexedDB schema using `idb` library
  - Stores: tasks, categories, users, pendingActions
  - Open/close helpers, versioned schema

- `src/offline/syncQueue.ts`:
  - PendingAction interface: { id, type: 'STATUS_CHANGE', taskId, payload, createdAt, retryCount }
  - addAction(action): save to IndexedDB
  - processQueue(): iterate pending actions, POST to API, remove on success
  - Handle 409 Conflict: flag for user resolution
  - Max 3 retries per action

- `src/offline/offlineIndicator.tsx`:
  - Yellow sticky banner top-of-page: "📡 Offline režim — změny se synchronizují po připojení"
  - Sync-in-progress: spinner in header
  - Sync complete: green toast "✅ Změny synchronizovány"
  - Pending action badge on Focus cards

- `src/sw.ts` (Service Worker via Workbox):
  - Precache static assets (JS, CSS, fonts)
  - Runtime cache: /api/focus and /api/tasks?assignee=me → stale-while-revalidate
  - Runtime cache: /api/dashboard → stale-while-revalidate
  - Network-only: all other API calls
  - Register in main.tsx

- `useOnlineStatus` hook:
  - Track navigator.onLine
  - Listen to 'online'/'offline' events
  - On reconnect → trigger syncQueue.processQueue()
  - Return { isOnline, isSyncing, pendingCount }

### Focus page offline integration:
NOTE: Agent C builds FocusPage. You provide the offline layer that wraps it.
- Create a `useOfflineFocus` hook that:
  - When online: fetch from API, save to IndexedDB
  - When offline: read from IndexedDB
  - Queue status changes to pendingActions when offline
- Export this hook. In Phase 2 (integration), it will be wired into Agent C's FocusPage.

## Testing requirements:

- `VoiceRecorder.test.tsx`:
  - Renders mic button in idle state
  - Click starts recording (mock MediaRecorder)
  - Shows pulsating animation during recording
  - Click again stops recording
  - Shows processing spinner while API calls
  - "Zrušit" resets to idle

- `VoiceTaskPreview.test.tsx`:
  - Displays raw transcription text
  - Fills form with parsed values
  - Yellow highlight for confidence 0.5-0.79
  - Red border for confidence < 0.5
  - Empty fields for null values
  - "Uložit" calls create task API
  - "Zkusit znovu" resets to recording state
  - Fields are editable (user can override AI suggestions)

- `Dashboard.test.tsx`:
  - Renders donut chart with status counts
  - Shows overall progress bar
  - Shows per-category progress
  - Shows overdue count
  - Handles empty data gracefully

- `UserManagement.test.tsx`:
  - Renders user table
  - Add user form submits correctly
  - Deactivate button works
  - Resend link button calls API
  - Cannot deactivate yourself

- `useVoiceRecorder.test.ts`:
  - State machine: idle → recording → stopped → idle
  - Returns audio blob on stop
  - Handles microphone permission denied
  - Handles MediaRecorder not supported

- `useOnlineStatus.test.ts`:
  - Returns isOnline based on navigator.onLine
  - Triggers sync on reconnect
  - Returns correct pendingCount

## Definition of done:
- Voice flow works: record → transcribe → parse → preview → edit → save (with MSW mocks)
- Dashboard renders with mock data
- Admin pages fully functional with MSW mocks
- Offline indicator shows/hides based on connection status
- IndexedDB stores and retrieves focus tasks
- Sync queue processes pending actions on reconnect
- All component tests pass
- All text is in Czech
```

---

## Phase 2 — Integration & E2E

**Agent:** Single Claude Code agent
**Branch:** `phase-2/integration` (branched from main after all Phase 1 merges)
**Depends on:** ALL Phase 1 branches merged into main (A → B → C → D order)

### Agent Prompt

```
You are the integration agent for "Bača". Four parallel agents have built the backend core, backend services, frontend core, and frontend advanced features. Everything has been merged into main. Your job is to:

1. Fix any integration issues from merging
2. Wire up cross-agent dependencies
3. Write all Playwright E2E tests
4. Verify the complete app works end-to-end

## Tissaia Skills

Use **`inquisitor`** (`/tissaia install inquisitor`) to review the merged code from all four agents before writing E2E tests. Run a review on each agent's contribution to catch integration issues early.

## Project Spec

Read the full specification from: baca-project-spec.md

## Tasks:

### 1. Fix merge conflicts and integration issues
- Run `dotnet build` and `npm run build` — fix any compilation errors
- Run `dotnet test` and `npm run test` — fix any test failures
- Review `Program.cs` — all four agents may have modified DI registration. Consolidate.
- Review `App.tsx` — agents C and D may have both modified it. Consolidate routes and global components.

### 2. Wire cross-agent dependencies
- Agent D's `useOfflineFocus` hook → integrate into Agent C's `FocusPage.tsx`:
  - FocusPage should use `useOfflineFocus` instead of direct API calls
  - "Hotovo" and "K review" buttons should use sync queue when offline
- Agent D's `VoiceFab` → ensure it's rendered in Agent C's `Layout.tsx` (or App.tsx)
- Agent D's `OfflineIndicator` → add to Layout
- Agent A's auth → verify Agent B's admin endpoints respect the auth middleware
- Agent B's WhatsApp service → verify Agent A's task assign endpoint actually calls it

### 3. Write Playwright E2E tests

Create ALL of these test files in `frontend/e2e/`:

- `auth.spec.ts`:
  - Navigate to /login → see two sections
  - Enter email → "Poslat odkaz" → success message
  - Navigate to magic link URL → logged in, redirected to home
  - Guest: enter PIN → logged in as read-only
  - Guest: verify cannot create/edit tasks
  - Logout → redirected to login

- `board.spec.ts`:
  - Navigate to /board → see 5 columns
  - Create new task → appears in correct column
  - Drag task from Open to InProgress → status updated
  - Filter by category → only matching tasks shown
  - Click task card → detail modal opens
  - Edit task in modal → changes saved
  - "Vezmu si to" on unassigned task → becomes assigned to me
  - Delete task → removed from board

- `focus.spec.ts`:
  - Navigate to / on mobile → see Focus page
  - Shows max 3 tasks
  - "Hotovo" button → task disappears, moved to Done
  - "K review" button → task disappears, moved to ForReview
  - All tasks done → shows "Všechno splněno!" message

- `voice.spec.ts`:
  - Navigate to /voice → see mic button
  - Click mic → recording UI shown (mock MediaRecorder in Playwright)
  - Stop recording → processing spinner → preview shown
  - Preview shows parsed fields with confidence styling
  - Edit a field → value changes
  - Click "Uložit" → task created, confirmation shown
  - FAB button on board page → opens voice modal

- `admin.spec.ts`:
  - Navigate to /admin/users → see user table
  - Add new user → appears in table
  - Change user role → updated
  - Deactivate user → marked inactive
  - Navigate to /admin/categories → see category list
  - Add category → appears
  - Delete empty category → removed
  - Delete category with tasks → error shown
  - Navigate to /admin/settings → change PIN → saved

- `mobile.spec.ts` (all tests at 375px viewport):
  - Default page is Focus, not Dashboard
  - Bottom tab bar visible with 5 tabs
  - Board page: columns scroll horizontally
  - Task cards are touch-friendly (min 44px tap targets)
  - FAB mic button visible and not overlapping tab bar
  - Admin tab hidden for non-admin users

### 4. E2E test infrastructure
- Use Playwright's built-in test server: start backend + frontend before tests
- Seed test data via API calls in beforeAll (create test users, categories, tasks)
- Use Playwright's built-in fixtures for auth state (save cookies, reuse across tests)
- Three browser configs: Desktop Chrome, Pixel 7, iPhone 14

### 5. CI pipeline update
- Update `.github/workflows/ci.yml`:
  - Add Playwright E2E step (after frontend-test)
  - E2E needs both backend and frontend running
  - Use `docker-compose up -d db` for PostgreSQL in CI
  - Upload Playwright report as artifact on failure

### 6. Final verification
- Run full CI locally: lint → test → e2e → build
- Verify docker-compose up works end-to-end
- Test magic link flow with Mailhog
- Verify responsive layout at 375px, 768px, 1440px

## Definition of done:
- `dotnet build` + `dotnet test` green
- `npm run test` green
- `npm run test:e2e` green (all 6 spec files, all 3 browser configs)
- Full app works in docker-compose
- CI pipeline passes end-to-end
```

---

## Phase 2b — User Guide

**Agent:** Single Claude Code agent (documentation specialist)
**Branch:** `phase-2b/user-guide` (branched from main after Phase 2 merge)
**Depends on:** Phase 2 merged, app fully working
**Why after Phase 2:** The docs agent must reference actual source code, real UI components, and working API to write accurate documentation. Writing docs against stubs produces inaccurate guides.

### Agent Prompt

```
You are the User Guide agent for "Bača" — a task tracker app for organizing a children's LARP event. The app is fully built and working. Your job is to create a concise, user-friendly guide IN CZECH that lives inside the app itself.

## Tissaia Skill

Use the **`tinkerer`** skill for implementation: `/tissaia install tinkerer`.

## Philosophy: LESS IS MORE

The users are ~40 LARP organizers (mostly non-technical, age 18–40) and a few parents (guests).
They will open this guide on a phone in a forest. They don't read manuals.
Every word must earn its place. If it can be shown as a screenshot/icon, don't write it.

## The Golden Rule

**The Welcome page (first page) must have MAX 1/2 A4 page of text.**
That's roughly 150–200 words. Not a word more. From there, the user can
drill into topics if they need more detail. Most won't.

## Structure

The guide is a set of Markdown files rendered as in-app pages.
Route: `/guide` (accessible from nav, also from a "?" help button).

### Welcome page (`/guide`)
MAX 200 words. Contains:
- One sentence: what Bača is ("Bača ti pomáhá organizovat Ovčinu.")
- Visual: 3–4 icons with labels showing the main sections (Board, Fokus, Hlas, Admin)
- "Jak začít" — 3 bullet points max:
  1. Dostals odkaz emailem? Klikni na něj — jsi přihlášen.
  2. Jsi host? Zadej PIN na přihlašovací stránce.
  3. Na mobilu se otevře Fokus — tvoje aktuální úkoly.
- Link: "Chci vědět víc →" leading to the topic pages.
- That's it. Nothing else on this page.

### Topic pages (drill-down, each MAX 1 A4 page):
1. `/guide/board` — Jak používat nástěnku (Kanban board)
   - What the 5 columns mean
   - How to drag tasks (with touch gesture hint)
   - How to filter
   - "Vezmu si to" explained

2. `/guide/focus` — Můj fokus
   - What it shows (top 3 tasks)
   - "Hotovo" and "K review" buttons
   - Offline: it works without signal

3. `/guide/voice` — Hlasový vstup
   - Tap mic, speak, review, save
   - What the AI understands (assignee, category, priority, due date)
   - Yellow/red fields = double-check

4. `/guide/admin` — Správa (only for Admin role)
   - Adding users (name + email + phone)
   - Managing categories
   - Changing guest PIN

5. `/guide/offline` — Funguje i bez signálu
   - What works offline (Focus, my tasks, mark Done)
   - What doesn't (voice, new tasks, board drag-and-drop)
   - Yellow banner = offline, changes sync later

## How to generate the content

1. **Read the actual source code** — examine every component in
   `src/components/` to understand what each page actually does.
   Don't write from the spec — write from the implementation.
2. **Read the TypeScript types** — understand the data model
   the user interacts with (task fields, statuses, priorities).
3. **Examine the UI** — check button labels, form fields,
   error messages already in the code. Use the same terminology.
4. **Cross-reference** — ensure guide terminology matches exactly
   what the user sees in the UI. If the button says "Hotovo",
   the guide says "Hotovo", not "Dokončit".

## Implementation

### Backend:
- No backend changes needed. The guide is static frontend content.

### Frontend:
Create these files:

- `src/components/guide/GuidePage.tsx` — main layout with sidebar/nav
- `src/components/guide/GuideWelcome.tsx` — the half-A4-page welcome
- `src/components/guide/GuideBoard.tsx`
- `src/components/guide/GuideFocus.tsx`
- `src/components/guide/GuideVoice.tsx`
- `src/components/guide/GuideAdmin.tsx`
- `src/components/guide/GuideOffline.tsx`

### Routing:
- Add routes: `/guide`, `/guide/board`, `/guide/focus`, `/guide/voice`,
  `/guide/admin`, `/guide/offline`
- Add "?" help button to the header (desktop) and bottom tab bar (mobile)
  — links to `/guide`
- Hide `/guide/admin` for non-admin users

### Design:
- Clean, minimal. White background, large text (16px+), generous spacing.
- Each topic page: short title, 3–5 bullet points or steps, one visual hint.
- Use the same Tailwind classes as the rest of the app.
- Mobile-first: must read well on a 375px screen.
- No horizontal scrolling, no tables, no code blocks.
- Icons from lucide-react where helpful (e.g., mic icon for voice section).

### Accessibility:
- Guide pages visible to ALL roles (including Guest).
- `/guide/admin` section only visible to Admin role.

## Testing:

Create component tests:
- `GuideWelcome.test.tsx`:
  - Renders with max ~200 words (count words in rendered output)
  - Contains links to all topic pages
  - Does NOT show admin section for Guest/User
- `GuidePage.test.tsx`:
  - All 6 topic routes render without errors
  - Navigation between topics works

## Self-review checklist (run before PR):

Before submitting, review your own output against these criteria:
- [ ] Welcome page is ≤ 200 words (count them)
- [ ] Every topic page fits on 1 A4 (≤ 400 words)
- [ ] Terminology matches EXACTLY what's in the UI (button labels, menu items)
- [ ] No technical jargon (no "endpoint", "API", "sync queue")
- [ ] Written in natural, friendly Czech (not translated English)
- [ ] Tested on 375px mobile viewport — readable, no overflow
- [ ] Guide is accessible from nav/header on every page

## Definition of done:
- Guide renders at `/guide` with welcome page ≤ 200 words
- 6 topic pages, each ≤ 1 A4 page
- "?" help button in header and tab bar
- All terminology cross-referenced against actual UI
- Component tests pass
- Guide hidden from no one (readable by Guest, Admin section hidden for non-admin)
- `npm run build` succeeds
```

---

## Phase 3 — Test Hardening

**Agent:** Single Claude Code agent (testing specialist)
**Branch:** `phase-3/hardening` (branched from main after Phase 2 merge)
**Depends on:** Phase 2 merged, all tests passing

### Agent Prompt

```
You are the testing hardening agent for "Bača". The app is fully built and all existing tests pass. Your job is to:

1. Audit test coverage and fill gaps
2. Add edge case tests
3. Add regression guards
4. Ensure the test suite is a reliable safety net

## Tissaia Skill

Use **`inquisitor`** (`/tissaia install inquisitor`) to run a full code review on the entire codebase first. The review findings (especially CRITICAL and WARNING) should directly inform which tests to add. Every finding that doesn't have a corresponding test is a gap to fill.

## Project Spec

Read the full specification from: baca-project-spec.md

## Your tasks:

### 1. Coverage audit
- Run `dotnet test --collect:"XPlat Code Coverage"` → identify uncovered code paths
- Run `npm run test -- --coverage` → identify uncovered components and hooks
- Target: 80%+ backend, 70%+ frontend
- List all uncovered areas and prioritize by risk

### 2. Backend hardening

Add missing tests or strengthen existing ones:

**Edge cases to test:**
- Task with maximum field lengths (title 200 chars, description 10000 chars)
- Empty string vs null in optional fields
- SQL injection attempts in search parameter
- XSS attempts in task title, description, comments
- Concurrent task status changes (two users drag same task simultaneously)
- Creating task with non-existent categoryId or assigneeId → proper error
- Creating subtask of a subtask (should this be allowed? Test current behavior)
- DueDate in the past when creating a task → allowed? Test it.
- Focus endpoint when user has 100+ open tasks → still returns only 3
- Dashboard stats with 10,000+ tasks → performance acceptable
- Magic link token with wrong format (not GUID) → 400 not 500
- Extremely long email address in auth request
- Unicode in task titles (Czech diacritics: ř, ž, č, š, ď, ť, ň, ú, ů, ý, á, é, í, ó)
- Voice parse with empty transcription → graceful error
- Voice parse with very long transcription (1000+ words)
- WhatsApp message with special characters in task title
- Category name uniqueness (case-insensitive?)
- Guest PIN change → existing guest sessions still valid? Or invalidated?

**Authorization hardening:**
- Review AuthorizationMatrixTests — ensure EVERY endpoint is covered
- Test that auth cookie cannot be forged
- Test session expiry (30 days)
- Test concurrent sessions (same user, multiple devices)
- Test deactivated user cannot access anything

**Regression guards:**
- For every bug found during development, add a specific regression test
- For every integration issue fixed in Phase 2, add a test that would catch it

### 3. Frontend hardening

**Component edge cases:**
- TaskCard with very long title (200 chars) — truncation works
- TaskCard with no category, no assignee, no due date — renders without errors
- KanbanBoard with 0 tasks — shows empty columns
- KanbanBoard with 50+ tasks in one column — scrollable
- FocusPage with exactly 1, 2, and 3 tasks — all render correctly
- Dashboard with all zeros — no division by zero
- LoginPage — double-click submit doesn't create two requests
- VoiceTaskPreview — all confidence combinations (all high, all low, mixed)
- Admin: add user with existing email → error handled
- Offline: Focus page renders from IndexedDB when API is unreachable

**Accessibility tests:**
- All interactive elements have aria labels
- Tab navigation works through the board
- Screen reader can announce task details
- Color is not the only indicator (icons accompany colors)

**Error state tests:**
- API returns 500 → user sees error message, not broken UI
- API returns 401 → redirect to login
- API returns 409 → conflict message displayed
- Network timeout → appropriate feedback
- Empty API responses → handled gracefully

### 4. E2E hardening

Add to existing Playwright specs or create new ones:

- `regression.spec.ts`: specific scenarios for any bugs found
- `performance.spec.ts`:
  - Board with 100 tasks loads in < 3 seconds
  - Dashboard with full data loads in < 2 seconds
  - Drag-and-drop has no visible lag
- `offline.spec.ts`:
  - Go offline → Focus page still shows cached tasks
  - Mark task Done while offline → task visually changes
  - Go online → pending action syncs
  - Offline indicator appears and disappears correctly
- `error-handling.spec.ts`:
  - Backend down → frontend shows error state, doesn't crash
  - Invalid magic link token → error page, not 500

### 5. Test infrastructure improvements
- Ensure test data is isolated between test runs (no test pollution)
- Add test helpers for common operations (create task, create user, login as role)
- Verify tests are deterministic (run 3 times, all pass)
- Check for flaky tests (timing-dependent assertions)
- Add test execution time monitoring — flag tests > 5 seconds

### 6. Documentation
- Add `TESTING.md` to repo root:
  - How to run all tests locally
  - Test architecture overview
  - Coverage targets and current numbers
  - How to add new tests (patterns to follow)
  - CI/CD test pipeline explanation

## Definition of done:
- Backend coverage ≥ 80%
- Frontend coverage ≥ 70%
- All edge case tests added and passing
- Zero flaky tests (verified by 3 consecutive runs)
- TESTING.md committed
- CI pipeline green with all new tests
- You are confident this test suite will catch regressions before they reach production
```

---

## Summary — Dependency Graph

```
                    ┌─────────────────┐
                    │   Phase 0       │
                    │   Foundation    │
                    │  (single agent) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │              │
     ┌────────▼──┐  ┌───────▼───┐  ┌───────▼───┐  ┌──────▼────┐
     │  Agent A  │  │  Agent B  │  │  Agent C  │  │  Agent D  │
     │  Backend  │  │  Backend  │  │  Frontend │  │  Frontend │
     │  Core     │  │  Services │  │  Core     │  │  Advanced │
     └────────┬──┘  └───────┬───┘  └───────┬───┘  └──────┬────┘
              │              │              │              │
              └──────────────┼──────────────┘──────────────┘
                             │
                    ┌────────▼────────┐
                    │   Phase 2       │
                    │  Integration    │
                    │  + E2E Tests    │
                    │  (single agent) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Phase 2b      │
                    │  User Guide     │
                    │  (docs agent)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Phase 3       │
                    │  Hardening      │
                    │  (test agent)   │
                    └─────────────────┘
```

## File Ownership Matrix

| File / Directory | Phase 0 | Agent A | Agent B | Agent C | Agent D | Phase 2 | Phase 2b | Phase 3 |
|-----------------|---------|---------|---------|---------|---------|---------|----------|---------|
| Models/, DTOs/, types/ | CREATE | read | read | read | read | fix | read | read |
| DbContext | CREATE | read | read | — | — | fix | — | read |
| Auth endpoints + service | stub | **IMPL** | read | — | — | verify | — | test |
| Task/Comment/Focus endpoints | stub | **IMPL** | read | — | — | verify | — | test |
| Voice/Dashboard/Admin endpoints | stub | read | **IMPL** | — | — | verify | — | test |
| WhatsApp/Voice services | stub | read | **IMPL** | — | — | verify | — | test |
| Board, Focus, Auth UI | stub | — | — | **IMPL** | read | wire | read | test |
| Voice, Dashboard, Admin UI | stub | — | — | read | **IMPL** | wire | read | test |
| Offline (SW, IndexedDB) | — | — | — | — | **IMPL** | wire | — | test |
| Layout, Nav | stub | — | — | **IMPL** | modify | fix | modify* | test |
| Guide pages (`/guide/*`) | — | — | — | — | — | — | **CREATE** | test |
| Unit/Component tests | setup | **WRITE** | **WRITE** | **WRITE** | **WRITE** | fix | **WRITE** | **HARDEN** |
| E2E tests | — | — | — | — | — | **WRITE** | — | **HARDEN** |
| CI pipeline | skeleton | — | — | — | — | **FINALIZE** | — | verify |

*Phase 2b adds "?" help button to Header and BottomTabBar.

Legend: CREATE = creates from scratch, stub = creates stub/placeholder, **IMPL** = implements business logic, **WRITE** = writes tests, **HARDEN** = adds edge cases + coverage, read = reads but doesn't modify, wire = connects cross-agent work, fix = fixes integration issues, verify = verifies it works, modify* = minimal addition, — = doesn't touch
