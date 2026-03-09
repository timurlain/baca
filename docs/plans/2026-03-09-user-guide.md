# User Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create an in-app user guide in Czech for the Baca task tracker, accessible at `/guide/*`, with a welcome page and 5 topic pages.

**Architecture:** Static React components (no backend). A `GuidePage` layout wraps all guide pages with sidebar navigation. Each topic is a standalone component with hardcoded Czech content. The guide is accessible to all roles; `/guide/admin` content is hidden for non-admins.

**Tech Stack:** React, React Router, Tailwind CSS (v4 with @theme), Vitest + Testing Library

---

### Task 1: GuidePage layout component

**Files:**
- Create: `frontend/src/components/guide/GuidePage.tsx`

**Step 1: Create GuidePage layout**

```tsx
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/App';
import { UserRole } from '@/types';

const topics = [
  { to: '/guide', label: 'Vítejte', end: true },
  { to: '/guide/board', label: 'Nástěnka (Board)' },
  { to: '/guide/focus', label: 'Můj fokus' },
  { to: '/guide/voice', label: 'Hlasový vstup' },
  { to: '/guide/admin', label: 'Správa', adminOnly: true },
  { to: '/guide/offline', label: 'Offline režim' },
];

export default function GuidePage() {
  const { user } = useAuthContext();
  const location = useLocation();

  const visibleTopics = topics.filter(
    (t) => !t.adminOnly || user?.role === UserRole.Admin
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Mobile topic selector */}
      <div className="sm:hidden mb-6">
        <select
          value={location.pathname}
          onChange={(e) => {
            window.location.href = e.target.value;
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {visibleTopics.map((t) => (
            <option key={t.to} value={t.to}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <nav className="hidden sm:block w-48 shrink-0">
          <ul className="space-y-1 sticky top-20">
            {visibleTopics.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-forest-100 text-forest-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <article className="flex-1 min-w-0 prose prose-sm max-w-none">
          <Outlet />
        </article>
      </div>
    </div>
  );
}
```

Note: `useAuthContext` is exported from App.tsx. Verify it's exported (it should be based on the codebase).

**Step 2: Commit**

```bash
git add frontend/src/components/guide/GuidePage.tsx
git commit -m "feat(guide): add GuidePage layout with sidebar navigation"
```

---

### Task 2: GuideWelcome page (MAX 200 words)

**Files:**
- Create: `frontend/src/components/guide/GuideWelcome.tsx`

**Step 1: Create GuideWelcome component**

Content must be MAX 200 words, in Czech, matching exact UI terminology.

```tsx
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/App';
import { UserRole } from '@/types';

export default function GuideWelcome() {
  const { user } = useAuthContext();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Příručka</h1>

      <p className="text-gray-700 text-base leading-relaxed">
        Bača ti pomáhá organizovat Ovčinu. Všechny úkoly na jednom místě — přehledně, rychle, i bez signálu.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Jak začít</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Otevři <Link to="/board" className="text-forest-700 font-medium hover:underline">Board</Link> a prohlédni si úkoly rozdělené do sloupců.</li>
          <li>Klikni na úkol a stiskni <strong>„Vezmu si to"</strong> — úkol se ti přiřadí.</li>
          <li>Na stránce <Link to="/" className="text-forest-700 font-medium hover:underline">Můj fokus</Link> uvidíš svoje nejdůležitější úkoly. Splněné označ <strong>„Hotovo"</strong>.</li>
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Témata</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TopicCard to="/guide/board" title="Nástěnka (Board)" desc="Sloupce, přesouvání, přiřazení" />
          <TopicCard to="/guide/focus" title="Můj fokus" desc="Tvoje úkoly, tlačítka Hotovo a K review" />
          <TopicCard to="/guide/voice" title="Hlasový vstup" desc="Zadej úkol hlasem" />
          {user?.role === UserRole.Admin && (
            <TopicCard to="/guide/admin" title="Správa" desc="Uživatelé, kategorie, PIN" />
          )}
          <TopicCard to="/guide/offline" title="Offline režim" desc="Co funguje bez signálu" />
        </div>
      </div>
    </div>
  );
}

function TopicCard({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="block p-4 border border-gray-200 rounded-xl hover:border-forest-600 hover:bg-forest-50 transition-colors"
    >
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      <p className="text-gray-500 text-xs mt-1">{desc}</p>
    </Link>
  );
}
```

**Step 2: Verify word count**

Count the visible text words (excluding HTML tags). Must be ≤ 200.

**Step 3: Commit**

```bash
git add frontend/src/components/guide/GuideWelcome.tsx
git commit -m "feat(guide): add GuideWelcome page (≤200 words, Czech)"
```

---

### Task 3: GuideBoard topic page

**Files:**
- Create: `frontend/src/components/guide/GuideBoard.tsx`

**Step 1: Create GuideBoard component**

MAX ~400 words. Covers: 5 columns, drag-and-drop with touch hint, creating tasks, "Vezmu si to".

```tsx
import { Link } from 'react-router-dom';

export default function GuideBoard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nástěnka (Board)</h1>

      <p className="text-gray-700">
        <Link to="/board" className="text-forest-700 font-medium hover:underline">Board</Link> je hlavní přehled všech úkolů. Úkoly jsou rozdělené do pěti sloupců podle stavu:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Sloupec</th>
              <th className="text-left px-3 py-2 font-bold">Význam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2 font-medium">Nápad</td><td className="px-3 py-2 text-gray-600">Náměty a nápady, které ještě nejsou zpracované.</td></tr>
            <tr><td className="px-3 py-2 font-medium">Otevřeno</td><td className="px-3 py-2 text-gray-600">Úkoly připravené k řešení.</td></tr>
            <tr><td className="px-3 py-2 font-medium">V řešení</td><td className="px-3 py-2 text-gray-600">Někdo na tom pracuje.</td></tr>
            <tr><td className="px-3 py-2 font-medium">K revizi</td><td className="px-3 py-2 text-gray-600">Hotovo, čeká na kontrolu.</td></tr>
            <tr><td className="px-3 py-2 font-medium">Hotovo</td><td className="px-3 py-2 text-gray-600">Dokončeno a schváleno.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Přesouvání úkolů</h2>
        <p className="text-gray-700">
          Na počítači přetáhni kartičku myší z jednoho sloupce do druhého. Na mobilu podrž prst na kartičce a přetáhni ji.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Detail úkolu</h2>
        <p className="text-gray-700">
          Klikni na kartičku — otevře se detail. Tady můžeš upravit název, popis, kategorii, prioritu a termín.
        </p>
        <p className="text-gray-700">
          Tlačítkem <strong>„Vezmu si to"</strong> si úkol přiřadíš. Ostatní uvidí, že na něm pracuješ.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Mazání</h2>
        <p className="text-gray-700">
          V detailu úkolu najdeš tlačítko <strong>„Smazat úkol"</strong>. Smazání je nevratné — smažou se i všechny subtasky a komentáře.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/guide/GuideBoard.tsx
git commit -m "feat(guide): add GuideBoard topic page"
```

---

### Task 4: GuideFocus topic page

**Files:**
- Create: `frontend/src/components/guide/GuideFocus.tsx`

**Step 1: Create GuideFocus component**

```tsx
import { Link } from 'react-router-dom';

export default function GuideFocus() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Můj fokus</h1>

      <p className="text-gray-700">
        <Link to="/" className="text-forest-700 font-medium hover:underline">Můj fokus</Link> zobrazuje tvoje nejdůležitější úkoly — ty, které máš přiřazené a jsou ve stavu <strong>Otevřeno</strong> nebo <strong>V řešení</strong>.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co tady uvidíš</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Kartičky tvých úkolů seřazené podle priority (vysoká nahoře).</li>
          <li>Barevný proužek vlevo ukazuje prioritu: <span className="text-red-600 font-medium">červená</span> = vysoká, <span className="text-blue-500 font-medium">modrá</span> = střední, <span className="text-gray-400 font-medium">šedá</span> = nízká.</li>
          <li>Kategorie a termín, pokud jsou nastavené.</li>
          <li>Progres subtasků (pokud úkol má podúkoly).</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Dvě akce</h2>
        <p className="text-gray-700">Pod každou kartičkou jsou dvě tlačítka:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>✓ Hotovo</strong> — přesune úkol do sloupce Hotovo.</li>
          <li><strong>→ K review</strong> — přesune úkol do sloupce K revizi. Použij, když potřebuješ, aby to někdo zkontroloval.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Všechno splněno?</h2>
        <p className="text-gray-700">
          Když nemáš žádné aktivní úkoly, uvidíš zprávu <strong>„Všechno splněno!"</strong> s odkazem na celý board.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm">
        Fokus funguje i offline — viz <Link to="/guide/offline" className="font-medium underline">Offline režim</Link>.
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/guide/GuideFocus.tsx
git commit -m "feat(guide): add GuideFocus topic page"
```

---

### Task 5: GuideVoice topic page

**Files:**
- Create: `frontend/src/components/guide/GuideVoice.tsx`

**Step 1: Create GuideVoice component**

```tsx
export default function GuideVoice() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Hlasový vstup</h1>

      <p className="text-gray-700">
        Nemáš čas psát? Řekni úkol nahlas a Bača ho zpracuje za tebe.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Jak na to</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Stiskni zelené tlačítko s mikrofonem (na stránce <strong>Hlas</strong> nebo plovoucí tlačítko na boardu).</li>
          <li>Mluv česky, přirozeně. Například: <em>„Koupit lano na scénu 3, vysoká priorita, přiřadit Tomášovi."</em></li>
          <li>Stiskni <strong>červené tlačítko</strong> pro zastavení nahrávání.</li>
          <li>AI vyplní formulář — zkontroluj a uprav, co je potřeba.</li>
          <li>Stiskni <strong>„Uložit úkol"</strong>.</li>
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co AI rozpozná</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Název</strong> úkolu</li>
          <li><strong>Přiřazeno</strong> — jméno organizátora</li>
          <li><strong>Kategorie</strong> — Hra, Logistika, Jídlo, Rekvizity, Komunikace</li>
          <li><strong>Priorita</strong> — Nízká, Střední, Vysoká</li>
          <li><strong>Termín</strong> — datum splnění</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Barevné indikátory</h2>
        <p className="text-gray-700">
          Pokud si AI není jistá, pole se zvýrazní:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><span className="inline-block w-3 h-3 bg-red-400 rounded mr-1"></span> <strong>Červená</strong> — AI hodně tipuje, zkontroluj.</li>
          <li><span className="inline-block w-3 h-3 bg-amber-300 rounded mr-1"></span> <strong>Žlutá</strong> — AI si není úplně jistá.</li>
          <li>Bez zvýraznění — AI je si jistá, většinou správně.</li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm">
        Hlasový vstup vyžaduje připojení k internetu — funguje přes AI v cloudu.
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/guide/GuideVoice.tsx
git commit -m "feat(guide): add GuideVoice topic page"
```

---

### Task 6: GuideAdmin topic page (admin-only)

**Files:**
- Create: `frontend/src/components/guide/GuideAdmin.tsx`

**Step 1: Create GuideAdmin component**

```tsx
export default function GuideAdmin() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Správa</h1>

      <p className="text-gray-700">
        Sekce <strong>Admin</strong> je dostupná jen pro administrátory. Najdeš tu správu uživatelů, kategorií, herních rolí a nastavení aplikace.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Uživatelé</h2>
        <p className="text-gray-700">
          V sekci <strong>Správa uživatelů</strong> můžeš:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Přidat nového organizátora — vyplň jméno, email a volitelně telefon.</li>
          <li>Zvolit roli: <strong>Admin</strong> (plný přístup) nebo <strong>Uživatel</strong> (organizátor bez správy).</li>
          <li>Tlačítkem <strong>„Odeslat odkaz"</strong> pošleš přihlašovací link na email.</li>
          <li>Deaktivovat uživatele, který už nepotřebuje přístup.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Kategorie</h2>
        <p className="text-gray-700">
          Kategorie pomáhají třídit úkoly (např. Hra, Logistika, Jídlo). V <strong>Správa kategorií</strong> můžeš:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Přidat novou kategorii s názvem a barvou.</li>
          <li>Upravit existující kategorie.</li>
          <li>Smazat kategorii (pouze pokud nemá přiřazené úkoly).</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Guest PIN</h2>
        <p className="text-gray-700">
          V <strong>Nastavení</strong> můžeš změnit PIN, kterým se hosté (rodiče) přihlašují do read-only režimu. Sdílej PIN jen s lidmi, kteří mají mít přístup.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/guide/GuideAdmin.tsx
git commit -m "feat(guide): add GuideAdmin topic page (admin-only)"
```

---

### Task 7: GuideOffline topic page

**Files:**
- Create: `frontend/src/components/guide/GuideOffline.tsx`

**Step 1: Create GuideOffline component**

```tsx
export default function GuideOffline() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Offline režim</h1>

      <p className="text-gray-700">
        Na Ovčině nemusí být všude signál. Bača umí pracovat i bez internetu — některé funkce běží lokálně na tvém telefonu.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co funguje offline</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Můj fokus</strong> — prohlížení tvých úkolů (z mezipaměti).</li>
          <li><strong>Hotovo / K review</strong> — změny se uloží a odešlou, až budeš online.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co vyžaduje internet</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Hlasový vstup</strong> — přepis i parsování běží v cloudu.</li>
          <li><strong>Vytváření nových úkolů</strong> — potřebuje backend.</li>
          <li><strong>Board drag-and-drop</strong> — přesouvání karet mezi sloupci.</li>
          <li><strong>Správa</strong> — všechny admin operace.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Jak to poznáš</h2>
        <p className="text-gray-700">
          Když jsi offline, nahoře se zobrazí lišta: <strong>„Offline režim — změny se synchronizují po připojení"</strong>. Jakmile se připojíš, uložené změny se automaticky odešlou.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/guide/GuideOffline.tsx
git commit -m "feat(guide): add GuideOffline topic page"
```

---

### Task 8: Wire routing — replace Placeholders with real components

**Files:**
- Modify: `frontend/src/App.tsx` (lines 118-124)

**Step 1: Add imports and update routes**

Add imports at top of App.tsx (after other imports):

```tsx
import GuidePage from '@/components/guide/GuidePage';
import GuideWelcome from '@/components/guide/GuideWelcome';
import GuideBoard from '@/components/guide/GuideBoard';
import GuideFocus from '@/components/guide/GuideFocus';
import GuideVoice from '@/components/guide/GuideVoice';
import GuideAdmin from '@/components/guide/GuideAdmin';
import GuideOffline from '@/components/guide/GuideOffline';
```

Replace the guide route block (lines ~118-124):

```tsx
{/* Guide (Phase 2b) */}
<Route path="/guide" element={<AuthGuard><GuidePage /></AuthGuard>}>
  <Route index element={<GuideWelcome />} />
  <Route path="board" element={<GuideBoard />} />
  <Route path="focus" element={<GuideFocus />} />
  <Route path="voice" element={<GuideVoice />} />
  <Route path="admin" element={<GuideAdmin />} />
  <Route path="offline" element={<GuideOffline />} />
</Route>
```

Note: This uses nested routing with `<Outlet />` in GuidePage. Remove the `Placeholder` component if it's no longer used elsewhere.

**Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(guide): wire guide routes with real components"
```

---

### Task 9: Add "?" help button to BottomTabBar

**Files:**
- Modify: `frontend/src/components/layout/BottomTabBar.tsx`

**Step 1: Add help nav item**

Add a help/guide entry to the `navItems` array, before the conditional Admin push. Insert after the "Staty" entry:

```tsx
{ to: '/guide', label: 'Nápověda', icon: (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
) },
```

**Step 2: Commit**

```bash
git add frontend/src/components/layout/BottomTabBar.tsx
git commit -m "feat(guide): add help button to mobile bottom tab bar"
```

---

### Task 10: Component tests

**Files:**
- Create: `frontend/src/test/components/GuideWelcome.test.tsx`
- Create: `frontend/src/test/components/GuidePage.test.tsx`

**Step 1: Write GuideWelcome test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GuideWelcome from '@/components/guide/GuideWelcome';
import { UserRole } from '@/types';

vi.mock('@/App', () => ({
  useAuthContext: () => ({
    user: { name: 'Admin', role: UserRole.Admin, avatarColor: '#000' },
    loading: false,
  }),
}));

function renderWelcome() {
  return render(
    <BrowserRouter>
      <GuideWelcome />
    </BrowserRouter>
  );
}

describe('GuideWelcome', () => {
  it('renders with max ~200 words', () => {
    const { container } = renderWelcome();
    const text = container.textContent || '';
    const words = text.trim().split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(220); // small buffer for link text
  });

  it('contains links to all topic pages', () => {
    renderWelcome();
    expect(screen.getByText('Nástěnka (Board)')).toBeInTheDocument();
    expect(screen.getByText('Můj fokus')).toBeInTheDocument();
    expect(screen.getByText('Hlasový vstup')).toBeInTheDocument();
    expect(screen.getByText('Offline režim')).toBeInTheDocument();
  });

  it('shows admin section for Admin role', () => {
    renderWelcome();
    expect(screen.getByText('Správa')).toBeInTheDocument();
  });

  it('hides admin section for non-admin', () => {
    vi.mocked(await import('@/App')).useAuthContext = () => ({
      user: { name: 'Guest', role: UserRole.Guest, avatarColor: '#000' },
      loading: false,
    });
    // Re-import to pick up new mock - actually easier to use a separate mock
  });
});
```

Note: For the admin-hidden test, create a separate test with its own mock. The executing agent should handle this correctly using `vi.mocked` or a separate describe block with `beforeEach`.

**Step 2: Write GuidePage test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GuidePage from '@/components/guide/GuidePage';
import GuideWelcome from '@/components/guide/GuideWelcome';
import GuideBoard from '@/components/guide/GuideBoard';
import { UserRole } from '@/types';

vi.mock('@/App', () => ({
  useAuthContext: () => ({
    user: { name: 'Admin', role: UserRole.Admin, avatarColor: '#000' },
    loading: false,
  }),
}));

function renderGuide(path = '/guide') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/guide" element={<GuidePage />}>
          <Route index element={<GuideWelcome />} />
          <Route path="board" element={<GuideBoard />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('GuidePage', () => {
  it('renders sidebar navigation', () => {
    renderGuide();
    expect(screen.getByText('Vítejte')).toBeInTheDocument();
    expect(screen.getByText('Nástěnka (Board)')).toBeInTheDocument();
  });

  it('renders welcome content at /guide', () => {
    renderGuide('/guide');
    expect(screen.getByText('Příručka')).toBeInTheDocument();
  });

  it('renders board content at /guide/board', () => {
    renderGuide('/guide/board');
    expect(screen.getByText('Nástěnka (Board)')).toBeInTheDocument();
  });

  it('hides admin link for non-admin', () => {
    vi.mocked(await import('@/App')).useAuthContext = () => ({
      user: { name: 'User', role: UserRole.User, avatarColor: '#000' },
      loading: false,
    });
    renderGuide();
    // Admin link should not be visible
  });
});
```

Note: These tests are intentionally sketched — the executing agent should adapt the mock pattern to work correctly with vitest (e.g., using `vi.hoisted` or factory functions for role-switching tests).

**Step 3: Run tests**

Run: `cd frontend && npm run test -- --run`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add frontend/src/test/components/GuideWelcome.test.tsx frontend/src/test/components/GuidePage.test.tsx
git commit -m "test(guide): add component tests for GuideWelcome and GuidePage"
```

---

### Task 11: Build verification and lint

**Step 1: Run full build**

```bash
cd frontend && npm run build
```
Expected: Build succeeds.

**Step 2: Run lint**

```bash
cd frontend && npm run lint
```
Expected: No lint errors.

**Step 3: Run all tests**

```bash
cd frontend && npm run test -- --run
```
Expected: All tests pass.

**Step 4: Final commit if any fixes needed**

---

### Task 12: Push and verify CI

**Step 1: Push branch**

```bash
git push -u origin phase-2b/user-guide
```

**Step 2: Watch CI**

```bash
gh run list --branch phase-2b/user-guide --limit 1
gh run watch <ID> --exit-status
```
Expected: All CI checks pass.
