# STASH Frontend — Remaining Implementation Roadmap

> **Status:** Phases 1–3D complete.
> This document covers everything left to build: Phases 4A–4D and Phases 5A–5D.
> Each section includes exact file paths, component specs, API dependencies, and implementation notes.

---

## Quick Reference — What's Done

| Phase | Feature | Status |
|---|---|---|
| 1A | Nav overhaul, FAB, dark mode, Toast, ActionModal focus trap | ✅ |
| 1B | FeedPage skeleton, BillsPage ActionModal, SubsPage persistence, NotifDrawer | ✅ |
| 1 (completion) | layout, login, useStash typed toasts, IntelPage scroll fix | ✅ |
| 2A | Bill creation modal | ✅ |
| 2B | Subscription creation + Track It one-tap | ✅ |
| 2C | VaultPage — card metaphor, detail sheet, transfer wizard | ✅ |
| 2D | BudgetsPage — overall + category cards, Heat Map budget bars | ✅ |
| 3A | TransactionDetailDrawer — drag dismiss, inline edit, confirm delete | ✅ |
| 3B | FeedPage search + filter panel — text, type, date, amount | ✅ |
| 3C | Dashboard redesign — battery bar, stat tiles, date-grouped receipts | ✅ |
| 3D | Motion system — useCountUp, useReducedMotion, interactive-card, CSS | ✅ |

---

## Phase 4A — Onboarding Flow

**Priority:** Medium · **Complexity:** Medium · **Impact:** High for new users

### What to build

A 3-step wizard that runs once on first login, controlled by a `hasOnboarded` flag in user settings. After completion, a persistent setup checklist on the Dash until all items are done.

### Files to create / modify

| File | Action |
|---|---|
| `src/components/ui/OnboardingWizard.tsx` | New — full-screen overlay wizard |
| `src/app/dashboard/page.tsx` | Add `showOnboarding` flag check, render `OnboardingWizard` |
| `src/hooks/useStash.ts` | Add `useCompleteOnboarding()` mutation |

### OnboardingWizard spec

```
Step 1 — Welcome
  - Full-screen bg-inverse-surface
  - Large animated "STASH" wordmark (slide in from top)
  - "What should we call you?" — single text input (pre-filled from auth name)
  - "LET'S GO →" primary CTA
  - Skip link bottom-right (goes directly to step 3)

Step 2 — Monthly Income
  - "What's your monthly income?" eyebrow
  - Large number input with currency symbol prefix
  - Hint: "This unlocks meaningful budget percentages."
  - Three quick-pick chips: $1k / $3k / $5k / $10k (tappable, fills input)
  - Optional — Skip button

Step 3 — First Savings Goal
  - "What are you saving for?" eyebrow
  - Bucket name input + target amount input side by side
  - Six emoji preset cards (horizontal scroll): ✈️ Travel, 🏠 Home, 💻 Tech, 🎓 Education, 🚗 Car, 🎯 Custom
  - Tapping a preset fills the name field
  - "CREATE MY FIRST BUCKET →" CTA

Completion:
  - Brief success animation (checkmark with spring scale)
  - Calls PATCH /api/settings with { hasOnboarded: true, monthlyIncome }
  - Calls POST /api/buckets with the first bucket data
  - Navigates to 'dash' with confetti burst (use canvas-confetti or CSS keyframes)
```

### Onboarding Checklist (post-wizard, on DashPage)

Shown below the hero strip until all 4 items are complete. Each item disappears with a checkmark animation when done.

```
[ ] Log your first transaction     → navigate to 'dash', open Quick Spend modal
[ ] Set a budget                   → navigate to 'budgets'
[ ] Create a savings bucket        → navigate to 'buckets'
[ ] Add an account                 → navigate to 'vault'
```

**Checklist state:** Derived from existing data — `transactions.length > 0`, `budgets.length > 0`, `buckets.length > 0`, `accounts.length > 0`. No new API endpoint needed.

### API dependency

```
PATCH /api/settings  — add monthlyIncome field to UpdateSettingsSchema
GET  /api/settings   — add hasOnboarded: boolean to response
```

### Design notes

- Wizard uses `AnimatePresence mode="wait"` with a horizontal slide between steps (step N slides left when going forward, right when going back)
- Progress dots at top (3 dots, active is filled lime)
- Background: `bg-inverse-surface` for steps 1–2, `bg-primary-container` for step 3
- The wizard mounts as a fixed overlay `z-[200]` above everything including the nav
- `useReducedMotion()` — skip the slide animation, just fade

---

## Phase 4B — Inline AI Nudges

**Priority:** Medium · **Complexity:** Medium · **Impact:** High — key differentiator

### What to build

Four contextual nudge surfaces that make the AI feel woven into the product, not siloed in the Intel page.

### 4B.1 — Post-transaction budget alert toast

**File:** `src/hooks/useStash.ts` — `useCreateTransaction` `onSuccess` callback

After a successful transaction creation, check if the new transaction pushes a category over `alertThresholdPct`. If so, show a typed info toast with a "See Budget" action.

```typescript
// In useCreateTransaction onSuccess:
onSuccess: (newTx) => {
  // Find matching budget from cache
  const budgets = qc.getQueryData<EnrichedBudget[]>(['budgets']) ?? [];
  const budget  = budgets.find((b) => b.scope === 'CATEGORY' && b.category === newTx.category);
  if (budget && budget.pct >= budget.alertThresholdPct) {
    showToast(
      `${CATEGORY_META[newTx.category]?.emoji} ${budget.pct}% of ${budget.name} budget used.`,
      'info'
    );
  }
}
```

**Note:** `showToast` isn't available inside useStash hooks directly — pass it as a parameter from the calling component, or use a Zustand selector inside the hook via `useAppStore.getState().showToast`.

### 4B.2 — Bucket ETA recalculation on boost

**File:** `src/components/pages/BucketsPage.tsx`

After a successful boost, show an inline ETA update on the boosted card instead of (or in addition to) a plain toast.

```
Current: "Boosted Tokyo Trip! ⚡" toast
New:     "Boosted Tokyo Trip! ⚡ At this rate, funded in 4 months." toast

Logic:
  const remaining  = bucket.targetUsd - (bucket.savedUsd + boostAmount);
  const months     = Math.ceil(remaining / bucket.monthlyUsd);
  const etaMessage = months <= 0 ? 'Almost there!' : `funded in ${months} month${months > 1 ? 's' : ''}`;
  showToast(`Boosted ${bucket.name}! ⚡ At this rate, ${etaMessage}`, 'success');
```

### 4B.3 — Subscription audit card

**File:** `src/components/pages/SubsPage.tsx`

When `burden.burdenPct > 15`, show a dismissible card above the Active section:

```
┌──────────────────────────────────────────┐
│ 🤖 SUBSCRIPTION AUDIT                    │
│ Your subs are eating 22% of income.      │
│ Biggest opportunity: Netflix ($15.99/mo) │
│ [View Intel →]  [Dismiss]                │
└──────────────────────────────────────────┘
```

- Dismissal stored in `sessionStorage` key `stash-sub-audit-dismissed`
- "View Intel" navigates to 'intel' page
- The "biggest opportunity" is the most expensive active subscription

**File:** `src/components/pages/SubsPage.tsx` — add after burden bar section

### 4B.4 — Weekly digest bottom sheet

**File:** `src/components/ui/WeeklyDigestSheet.tsx` (new)

When a notification of type `WEEKLY_DIGEST` is tapped in NotifDrawer, instead of navigating to dash, open a mini weekly summary bottom sheet.

```
Sheet content:
  - Week date range (e.g. "Jun 2 – Jun 8")
  - Total spent this week vs last week (% change)
  - Top 3 categories with emoji + amount
  - One AI tip from intel.tips[0]
  - CTA: "See full breakdown →" → navigate to 'feed' with date filter pre-applied
```

**File changes:**
- `src/components/ui/NotifDrawer.tsx` — detect `n.type === 'WEEKLY_DIGEST'`, open sheet instead of navigate
- `src/components/ui/WeeklyDigestSheet.tsx` — new slide-up bottom sheet component

**API dependency:** The existing `/api/notifications` response already includes the notification body. The sheet content can be derived from existing stats/transactions queries — no new endpoint needed.

---

## Phase 4C — Feed Intelligence Upgrades

**Priority:** Low-Medium · **Complexity:** Low-Medium · **Impact:** Medium

### 4C.1 — Merchant grouping in Feed

**File:** `src/components/pages/FeedPage.tsx`

Group consecutive (within 7 days) transactions from the same merchant and render them collapsed:

```
Before: 3 separate Netflix cards
After:
┌──────────────────────────────────────────┐
│ 🎮 NETFLIX          3 charges this week  │
│ $47.97 total                    Jun 1–7  │
│ [Expand ▾]                               │
└──────────────────────────────────────────┘
```

**Implementation:**
```typescript
// Group by merchant + 7-day window before rendering
function groupMerchantTransactions(items: Transaction[]): GroupedItem[] {
  // ...group logic — returns either single tx or MerchantGroup
}
```

State: `expandedGroups: Set<string>` — tracks which merchant groups are expanded. Default collapsed. Tapping "Expand" toggles and animates with `AnimatePresence` height.

### 4C.2 — Logging streak indicator

**File:** `src/components/pages/FeedPage.tsx` — add to page header

```
If transactions exist on N consecutive days:
  Show: "🔥 3-day logging streak" badge next to "SMART FEED" header
  At 7 days: "🔥 7-day streak — you're on fire"
  At 30 days: "👑 30-day legend"
```

**Implementation:** Client-side, derived from `transactions` — count consecutive days with at least one transaction up to today.

### 4C.3 — Unusual spend flag

**File:** `src/components/ui/TransactionDetailDrawer.tsx`

The `aiInsight` field already captures unusual spend. Upgrade the visual treatment:

```
Current: Plain text insight block
New:     If aiInsight contains "unusual" or "above average" or "high":
         - Add a ⚠️ badge on the Feed card (visible without opening drawer)
         - In drawer: highlight the insight block with bg-[#fff3cd] border-[#ff8800]
```

**File:** `src/components/pages/FeedPage.tsx` — add `⚠️` badge to article card when `tx.aiInsight?.toLowerCase().includes('unusual' || 'above average' || 'high')`

### 4C.4 — Pull-to-refresh (Feed, Buckets, Bills, Subs)

**File:** `src/hooks/usePullToRefresh.ts` (new)

```typescript
// Custom hook — tracks touch delta, triggers refetch on threshold
export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement>,
  onRefresh: () => Promise<void>,
  options?: { threshold?: number; indicatorHeight?: number }
): { isPulling: boolean; pullProgress: number }
```

**Indicator:** A custom branded spinner above the scroll area:
- Shows the STASH "S" logo rotating, or the lightning bolt icon spinning
- Appears when `pullProgress > 0`, fully visible at `pullProgress >= 1`
- Springs back after `onRefresh()` resolves

**Files to update:**
- `src/components/pages/FeedPage.tsx`
- `src/components/pages/BucketsPage.tsx`
- `src/components/pages/BillsPage.tsx`
- `src/components/pages/SubsPage.tsx`

---

## Phase 4D — Feed Intelligence (AI Nudges continued)

**Priority:** Low · **Complexity:** Low · **Impact:** Medium

This phase was originally listed as "Feed Intel" in the roadmap and covers the remaining AI surface areas not addressed in 4B/4C.

### 4D.1 — Suggested recurring transaction tracking

Already partially implemented in `SubsPage` (detected recurring shelf). Extend to Feed:

**File:** `src/components/pages/FeedPage.tsx`

After the filter row, if `suggestData.suggestions.length > 0` and no category filter is active, show a dismissible banner:

```
┌──────────────────────────────────────────┐
│ 🤖 We noticed 2 recurring charges.       │
│ [Track Netflix →]  [Track Spotify →]  ✕  │
└──────────────────────────────────────────┘
```

Tapping "Track X" navigates to 'subs' with the suggestion pre-selected.

**New query needed in FeedPage:**
```typescript
const { data: suggestData } = useQuery({
  queryKey: ['subscriptions-suggestions'],
  queryFn:  () => fetch('/api/subscriptions?view=suggestions').then(r => r.json()).then(d => d.data),
});
```

---

## Phase 5A — PWA Enhancements

**Priority:** Low · **Complexity:** High · **Impact:** Medium

### 5A.1 — Custom install prompt

**File:** `src/components/ui/InstallPrompt.tsx` (new)

```typescript
// Capture beforeinstallprompt event
// Show custom STASH-styled prompt when appropriate
// Dismiss stores 'stash-install-dismissed' in localStorage with timestamp
// Re-shows after 7 days
```

**File:** `src/app/dashboard/page.tsx` — mount `<InstallPrompt />` once

**Design:**
```
┌──────────────────────────────────────────┐
│ 📱 Add STASH to your home screen        │
│ Faster access, works offline.            │
│ [Add to Home Screen]  [Not now]          │
└──────────────────────────────────────────┘
```
Slides up from bottom, sits above the nav bar (`bottom-[76px]`).

### 5A.2 — Offline state banner

**File:** `src/components/ui/OfflineBanner.tsx` (new)

```typescript
// Listens to window online/offline events
// Shows a slim top banner when offline: "You're offline — changes will sync when you reconnect."
// Banner auto-dismisses 3 seconds after coming back online with a "You're back ✓" message
```

**File:** `src/app/dashboard/page.tsx` — mount `<OfflineBanner />`

### 5A.3 — Mutation queue for offline

**File:** `src/hooks/useOfflineQueue.ts` (new)

```typescript
// Stores failed mutations in localStorage when offline
// On reconnect (window 'online' event), replays them via React Query
// Shows a toast: "Syncing 3 offline transactions..."
```

This is a significant undertaking — implement after 5A.1 and 5A.2 are stable.

---

## Phase 5B — Haptic Feedback

**Priority:** Low · **Complexity:** Low · **Impact:** Medium (mobile feel quality)

**File:** `src/lib/haptics.ts` (new)

```typescript
export const haptics = {
  // Short pulse — button press confirmation
  light: () => navigator.vibrate?.(10),

  // Double pulse — successful transaction logged
  success: () => navigator.vibrate?.([10, 40, 10]),

  // Error pattern — failed action
  error: () => navigator.vibrate?.([50, 20, 50]),

  // Long single — destructive action (delete confirm)
  warning: () => navigator.vibrate?.(40),
};
```

**Wire into:**
- `ActionModal` submit → `haptics.light()` on button press, `haptics.success()` on successful mutation
- `TransactionDetailDrawer` delete confirm → `haptics.warning()`
- `BottomNav` tap → `haptics.light()` (very subtle)
- Toast `'error'` type → `haptics.error()`

**File changes:**
- `src/lib/haptics.ts` — new
- `src/components/ui/ActionModal.tsx` — import and call haptics
- `src/components/ui/TransactionDetailDrawer.tsx` — delete confirm haptic
- `src/components/layout/BottomNav.tsx` — nav tap haptic

---

## Phase 5C — Keyboard Shortcuts (Desktop)

**Priority:** Low · **Complexity:** Low · **Impact:** Low-Medium (power users only)

**File:** `src/hooks/useKeyboardShortcuts.ts` (new)

```typescript
export function useKeyboardShortcuts() {
  // Mounts on dashboard/page.tsx
  // Only active when no modal or drawer is open (check store state)
}

// Shortcuts:
// N          → open Quick Spend modal   (like "New transaction")
// I          → open Load Up modal
// 1          → navigate('dash')
// 2          → navigate('feed')
// 3          → navigate('buckets')
// 4          → navigate('bills')
// 5          → navigate('vault')
// /          → open FeedPage search bar (if on feed)
// Escape     → close any open modal/drawer (already handled per-component)
// ?          → show shortcuts cheat sheet overlay
```

**Cheat sheet overlay:** A simple modal listing all shortcuts, triggered by `?`. Uses the existing `ActionModal` shell with read-only content, no form fields.

**File changes:**
- `src/hooks/useKeyboardShortcuts.ts` — new
- `src/app/dashboard/page.tsx` — mount the hook

---

## Phase 5D — Performance

**Priority:** Low · **Complexity:** High · **Impact:** Medium

### 5D.1 — Feed list virtualization

**File:** `src/components/pages/FeedPage.tsx`

The Feed can have 100+ items. Use an intersection observer approach rather than a virtualization library (no extra deps):

```typescript
// Render only items within 2 "pages" of the viewport
// Use IntersectionObserver on a sentinel element at the bottom
// When sentinel intersects, increase visibleCount by 20
const [visibleCount, setVisibleCount] = useState(20);
const sentinelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + 20); },
    { threshold: 0.1 }
  );
  if (sentinelRef.current) observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, []);

const visibleTx = transactions.slice(0, visibleCount);
```

### 5D.2 — Lazy-load IntelPage

**File:** `src/app/dashboard/page.tsx`

```typescript
// Replace static import with dynamic
const IntelPage = dynamic(() => import('@/components/pages/IntelPage'), {
  loading: () => <IntelPageSkeleton />,
});
```

The IntelPage includes the DOS terminal, chart, and heavy animation — lazy loading shaves ~15kb from the initial bundle.

### 5D.3 — Image and font optimization

**File:** `src/app/layout.tsx`

```typescript
// Add preconnect for Material Symbols (already done in Phase 1)
// Add font-display: optional for Space Grotesk to prevent FOUT
// Verify next/font settings use display: 'swap' (already done)
```

**File:** `next.config.ts`

```typescript
// Add bundle analyzer for visibility
// Add compression headers
// Verify ISR or SSG on any static routes
```

### 5D.4 — React Query caching tuning

**File:** `src/app/providers.tsx`

```typescript
// Current: default staleTime (0ms) — refetches on every focus
// Better:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   30_000,   // 30s — data considered fresh
      gcTime:      5 * 60_000, // 5min garbage collection
      retry:       1,
      refetchOnWindowFocus: false, // already set for intel, should be global
    },
  },
});
```

---

## Backend Routes Still Needed

These frontend features are built to call these routes but the backend handlers need implementing:

| Route | Used by | What it should do |
|---|---|---|
| `PATCH /api/transactions/[id]` | `TransactionDetailDrawer` | Update `category`, `note` fields on a transaction |
| `PATCH /api/settings` with `monthlyIncome`, `hasOnboarded` | Phase 4A onboarding | Store income and onboarding completion flag |
| `GET /api/stats` — add `topCategory`, `recoveryMove` fields | DashPage AI CTA | Already used — verify these fields are returned |

---

## Suggested Implementation Order

| Priority | Phase | Effort | Notes |
|---|---|---|---|
| 1 | 4A Onboarding | 2–3 days | High value for new users, self-contained |
| 2 | 4B.1 Budget alert toast | 1 hour | Tiny change, high signal |
| 3 | 4B.2 Bucket ETA boost | 30 min | Single toast string change |
| 4 | 4B.3 Sub audit card | 2 hours | One new component in SubsPage |
| 5 | 4C.4 Pull-to-refresh | 1 day | New hook + 4 page updates |
| 6 | 5B Haptics | 2 hours | New lib + 4 small wires |
| 7 | 4C.1 Merchant grouping | 1 day | Feed logic refactor |
| 8 | 4C.2 Logging streak | 2 hours | Client-side derived |
| 9 | 4C.3 Unusual spend flag | 1 hour | String match on aiInsight |
| 10 | 5A.1 Install prompt | 3 hours | beforeinstallprompt API |
| 11 | 5A.2 Offline banner | 2 hours | navigator.onLine events |
| 12 | 5C Keyboard shortcuts | 3 hours | New hook, cheat sheet modal |
| 13 | 4B.4 Weekly digest sheet | 1 day | New WeeklyDigestSheet component |
| 14 | 5D.1 Feed virtualization | 3 hours | IntersectionObserver pattern |
| 15 | 5D.2 Lazy IntelPage | 30 min | One dynamic() import |
| 16 | 5D.4 Query tuning | 1 hour | providers.tsx config |
| 17 | 5A.3 Offline queue | 2–3 days | Complex, do last |

---

## File Creation Summary

New files still to be created:

```
src/components/ui/OnboardingWizard.tsx       Phase 4A
src/components/ui/WeeklyDigestSheet.tsx      Phase 4B.4
src/hooks/usePullToRefresh.ts               Phase 4C.4
src/components/ui/InstallPrompt.tsx         Phase 5A.1
src/components/ui/OfflineBanner.tsx         Phase 5A.2
src/hooks/useOfflineQueue.ts               Phase 5A.3
src/lib/haptics.ts                          Phase 5B
src/hooks/useKeyboardShortcuts.ts           Phase 5C
```

Files to be modified (key changes only):

```
src/hooks/useStash.ts                       Phase 4B.1 (budget alert in createTx onSuccess)
src/components/pages/SubsPage.tsx           Phase 4B.3 (audit card)
src/components/pages/FeedPage.tsx           Phase 4C.1, 4C.2, 4C.3, 4D.1, 5D.1
src/components/ui/TransactionDetailDrawer.tsx  Phase 4C.3 (unusual spend highlight)
src/components/ui/ActionModal.tsx           Phase 5B (haptics)
src/components/layout/BottomNav.tsx         Phase 5B (haptics)
src/app/dashboard/page.tsx                  Phase 4A, 5A.1, 5A.2, 5C
src/app/providers.tsx                       Phase 5D.4 (query config)
next.config.ts                              Phase 5D.3
```