# E2E Test Cases — Bača

> **For agents:** Before implementing any test case, check `frontend/e2e/auth.spec.ts` and other existing spec files for duplicates. Use the shared `loginAsAdmin` and `loginAsGuest` helpers already defined in the test files.

## Existing Coverage

Already implemented in `frontend/e2e/`:
- **auth.spec.ts**: Login page visibility (organizer + guest tabs), email submission feedback, test-endpoint login, guest PIN login
- **board.spec.ts**: 5 columns visible, API-created task appears, task detail modal, task deletion
- **focus.spec.ts**: Focus page accessible, assigned tasks shown, heading visible
- **admin.spec.ts**: Users table, categories list, settings page
- **voice.spec.ts**: Voice page accessible, recording UI, FAB visibility
- **mobile.spec.ts**: Mobile home, tab bar, admin tab hidden for guests

---

## New Test Cases to Add

### AUTH-01: Magic link email sends successfully (Poslat odkaz)

**File:** `auth.spec.ts`
**Precondition:** Seed user `admin@baca.local` exists
**Steps:**
1. Navigate to `/login`
2. Fill email input with `admin@baca.local`
3. Click "Poslat odkaz" button
4. Wait for response

**Expected:** Green success message "Odkaz k přihlášení byl odeslán na váš email." appears (not the red error message).

**Why:** Bug was found where 200 empty body from `/api/auth/request-link` caused `res.json()` to throw, showing error even though email was sent. Fixed by handling empty response body in `client.ts`.

**Note:** Existing test "email login shows feedback after submission" only checks for ANY feedback (`/odkaz|odeslán|nepodařilo/i`). This test should specifically assert the SUCCESS message appears.

---

### AUTH-02: Magic link email with unknown address shows error

**File:** `auth.spec.ts`
**Precondition:** No user with email `unknown@example.com`
**Steps:**
1. Navigate to `/login`
2. Fill email with `unknown@example.com`
3. Click "Poslat odkaz"

**Expected:** Red error message "Nepodařilo se odeslat email. Zkontrolujte adresu." appears. Backend returns 404.

---

### AUTH-03: Magic link verify token sets cookie and redirects

**File:** `auth.spec.ts`
**Precondition:** Valid magic link token exists for a user
**Steps:**
1. Create a magic link token via test API (or directly in DB)
2. Navigate to `/auth/verify/{token}`
3. Wait for navigation

**Expected:**
- Page redirects to `/` (home)
- User is logged in (no redirect back to `/login`)
- Subsequent `GET /api/auth/me` returns the user

**Why:** Bug was found where `AuthProvider.auth.me()` returning 401 triggered redirect to `/login` before VerifyPage could process the token. Fixed by excluding `/auth/verify` from the 401 redirect.

---

### AUTH-04: Magic link verify with invalid/expired token shows error

**File:** `auth.spec.ts`
**Steps:**
1. Navigate to `/auth/verify/invalid-token-abc123`
2. Wait for response

**Expected:** Error message "Odkaz je neplatný nebo vypršel." and a "Zpět na přihlášení" button appear.

---

### AUTH-05: Magic link verify — "Zpět na přihlášení" button navigates to login

**File:** `auth.spec.ts`
**Steps:**
1. Navigate to `/auth/verify/invalid-token`
2. Wait for error to appear
3. Click "Zpět na přihlášení"

**Expected:** Page navigates to `/login`.

---

### AUTH-06: Guest login with correct PIN redirects to home

**File:** `auth.spec.ts`
**Precondition:** Guest PIN is `ovcina2026`
**Steps:**
1. Navigate to `/login`
2. Click "Host" tab
3. Fill PIN with `ovcina2026`
4. Click "Vstoupit"

**Expected:** Redirect to `/` (home). No error message.

**Note:** Existing test uses direct API call. This test should use the actual UI flow.

---

### AUTH-07: Guest login with wrong PIN shows error

**File:** `auth.spec.ts`
**Steps:**
1. Navigate to `/login`
2. Click "Host" tab
3. Fill PIN with `wrongpin`
4. Click "Vstoupit"

**Expected:** Red error message "Nesprávný PIN." appears. No redirect.

---

### AUTH-08: Logout clears session and redirects to login

**File:** `auth.spec.ts`
**Precondition:** Logged in as admin
**Steps:**
1. Login via test endpoint
2. Navigate to `/`
3. Click logout button (find in Layout/nav)
4. Wait for navigation

**Expected:** Redirected to `/login`. Visiting `/` again redirects back to `/login`.

---

### AUTH-09: Unauthenticated user accessing protected route redirects to login

**File:** `auth.spec.ts`
**Steps:**
1. Clear all cookies
2. Navigate to `/board`

**Expected:** Redirect to `/login`.

---

### AUTH-10: Unauthenticated user accessing /auth/verify does NOT redirect to login

**File:** `auth.spec.ts`
**Steps:**
1. Clear all cookies
2. Navigate to `/auth/verify/some-token`

**Expected:** Page shows either the spinner ("Ověřování…") or error message — NOT a redirect to `/login`.

**Why:** This verifies the 401-redirect exclusion for the verify page.

---

### AUTH-11: Loading spinner shows while auth state is being determined

**File:** `auth.spec.ts`
**Steps:**
1. Clear cookies
2. Navigate to `/` with slow network simulation (or intercept `/api/auth/me` with delay)

**Expected:** Loading spinner with text "Načítání…" appears briefly before redirect to `/login`.

---

## Board — Additional Test Cases

### BOARD-01: Drag and drop task between columns

**File:** `board.spec.ts`
**Precondition:** Logged in as admin, at least one task in "Otevřené" column
**Steps:**
1. Navigate to `/board`
2. Drag a task card from "Otevřené" to "Rozpracované"

**Expected:** Task moves to new column. After page reload, task remains in new column (persisted).

---

### BOARD-02: Create task via UI with all fields

**File:** `board.spec.ts`
**Steps:**
1. Navigate to `/board`
2. Click "+" / create task button
3. Fill title, description, category, assignee, priority
4. Submit

**Expected:** New task card appears in the "Nápad" column. Task detail shows all filled fields.

---

### BOARD-03: Edit task details in modal

**File:** `board.spec.ts`
**Precondition:** Task exists
**Steps:**
1. Click on task card to open modal
2. Change title
3. Save

**Expected:** Updated title visible on card after closing modal.

---

### BOARD-04: Filter board by category

**File:** `board.spec.ts`
**Steps:**
1. Navigate to `/board`
2. Select a category filter
3. Verify only matching tasks are shown

---

### BOARD-05: User board page shows only user's tasks

**File:** `board.spec.ts`
**Steps:**
1. Login as admin
2. Assign a task to self
3. Navigate to `/board/user`

**Expected:** Only tasks assigned to the current user are shown.

---

## Focus — Additional Test Cases

### FOCUS-01: Focus page shows tasks sorted by priority

**File:** `focus.spec.ts`
**Precondition:** Multiple tasks with different priorities assigned to user
**Steps:**
1. Navigate to `/focus`

**Expected:** Tasks are listed with highest priority first.

---

### FOCUS-02: Complete task from focus page

**File:** `focus.spec.ts`
**Steps:**
1. Navigate to `/focus`
2. Mark a task as done (checkbox/button)

**Expected:** Task disappears from focus list (or moves to done section).

---

## Admin — Additional Test Cases

### ADMIN-01: Create new user

**File:** `admin.spec.ts`
**Steps:**
1. Navigate to `/admin/users`
2. Click add user button
3. Fill name and email
4. Submit

**Expected:** New user appears in the table.

---

### ADMIN-02: Create new category

**File:** `admin.spec.ts`
**Steps:**
1. Navigate to `/admin/categories`
2. Click add category
3. Fill name and color
4. Submit

**Expected:** New category appears in the list.

---

### ADMIN-03: Delete category

**File:** `admin.spec.ts`
**Precondition:** At least one category that is not assigned to any task
**Steps:**
1. Navigate to `/admin/categories`
2. Click delete on a category
3. Confirm deletion

**Expected:** Category removed from list.

---

### ADMIN-04: Game roles CRUD

**File:** `admin.spec.ts`
**Steps:**
1. Navigate to `/admin/gameroles`
2. Create a new game role
3. Edit the game role name
4. Delete the game role

**Expected:** Each operation succeeds, list updates accordingly.

---

### ADMIN-05: Guest user cannot access admin pages

**File:** `admin.spec.ts`
**Steps:**
1. Login as guest
2. Navigate to `/admin/users`

**Expected:** Redirect to home, or access denied message.

---

## Voice — Additional Test Cases

### VOICE-01: Voice FAB not visible for guest users

**File:** `voice.spec.ts`
**Steps:**
1. Login as guest
2. Navigate to `/board`

**Expected:** VoiceFab button is NOT visible.

**Note:** Existing test checks "non-guest" case. This is the inverse.

---

## Mobile — Additional Test Cases

### MOBILE-01: Home page shows FocusPage on mobile viewport

**File:** `mobile.spec.ts`
**Steps:**
1. Set viewport to mobile (375px)
2. Login
3. Navigate to `/`

**Expected:** Focus page content is shown (not Dashboard).

---

### MOBILE-02: Home page shows Dashboard on desktop viewport

**File:** `mobile.spec.ts`
**Steps:**
1. Set viewport to desktop (1280px)
2. Login
3. Navigate to `/`

**Expected:** Dashboard content is shown (not Focus page).

---

## Offline — Test Cases

### OFFLINE-01: Offline indicator appears when network is lost

**File:** New `offline.spec.ts`
**Steps:**
1. Login
2. Navigate to any authenticated page
3. Simulate offline (`context.setOffline(true)`)

**Expected:** OfflineIndicator banner appears.

---

### OFFLINE-02: Offline indicator disappears when network returns

**File:** `offline.spec.ts`
**Steps:**
1. Go offline (from OFFLINE-01)
2. Simulate online (`context.setOffline(false)`)

**Expected:** OfflineIndicator banner disappears.

---

## Guide — Test Cases

### GUIDE-01: Guide page accessible and shows welcome

**File:** New `guide.spec.ts`
**Steps:**
1. Login
2. Navigate to `/guide`

**Expected:** GuideWelcome content is visible.

---

### GUIDE-02: Guide navigation between sections

**File:** `guide.spec.ts`
**Steps:**
1. Navigate to `/guide`
2. Click through each section: board, focus, voice, admin, offline

**Expected:** Each section loads with relevant content.

---

## Summary

| Area | Existing | New | Total |
|------|----------|-----|-------|
| Auth | 5 | 11 | 16 |
| Board | 4 | 5 | 9 |
| Focus | 3 | 2 | 5 |
| Admin | 3 | 5 | 8 |
| Voice | 3 | 1 | 4 |
| Mobile | 3 | 2 | 5 |
| Offline | 0 | 2 | 2 |
| Guide | 0 | 2 | 2 |
| **Total** | **21** | **30** | **51** |
