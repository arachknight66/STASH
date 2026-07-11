# ⚡ STASH — Financial Main Character Energy

**STASH** is a Gen-Z personal finance PWA designed to help you track your coins, build savings, and hit goals without compromising your data privacy. No spreadsheets (boomer vibes), no bank credentials linking (not it), just pure financial control. 🤫

---

## 🤫 Why STASH? (No Cap)
* **Zero Bank Logins**: Keep your account passwords. Manual entry builds spending mindfulness. Bet.
* **Logging Streaks**: Keep the fire burning. Accumulate daily streak counts and don't let it freeze. 🔥
* **Savings Buckets with ETA**: Allocates goals based on your income and tracks target completion dates. Sheesh.
* **Subscription Audits**: Alerts you when recurring services devour $>15\%$ of your monthly income. Unsubscribe instantly.
* **Offline-First & PWA**: Track your transactions on the subway, in flight, or at the club. Adds to your home screen in one tap.

---

## 🛠 Tech Stack (Locked In)
* **Framework**: Next.js 14 App Router (Client Shell)
* **Styling**: Tailwind CSS
* **Animations**: Framer Motion
* **State Management**: Zustand
* **Data Fetching**: TanStack React Query
* **Database & Auth**: Firebase Auth + Firestore DB (with local JSON database fallback for zero-config offline runs)

---

## 🚀 Quick Start (Let's Cook)

To spin up the vault locally, run these commands inside the `app/` folder:

### 1. Install Dependencies
```bash
cd app
npm install
```

### 2. Launch Local Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and you're ready to stash.

> [!NOTE]
> If Firebase credentials are not specified in your `.env` file, the app automatically drops back to a local `stash_local_db.json` database. Zero setups required. 

---

## 🎹 Keyboard Shortcuts (Pro Gamer Move)
Navigate the shell at lightning speed:
* `1` ➔ Dashboard
* `2` ➔ Feed
* `3` ➔ Savings Buckets
* `4` ➔ Bill Calendar
* `5` ➔ Wallet Accounts
* `N` ➔ Quick Log Expense
* `I` ➔ Load Up Cash
* `?` ➔ Shortcuts Cheatsheet

---

## 🔒 Danger Zone: Permanent Account Teardown
Want out? In Settings, go to the **Danger Zone** and trigger account deletion. We clean up all accounts, ledger history, alerts, and tokens, confirming with Google-grade security challenges and full teardown feedback animations. 

**Go get that bread. 💸**
