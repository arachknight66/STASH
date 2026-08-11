# STASH Security Remediation

## Original Issues

1. **JOSE ESM/CommonJS Build Failure:** Production Next.js build failed during static page data generation for `/api/accounts/[id]` with `Error: Unexpected module status 0. Cannot require() ES Module .../jose/dist/webapi/index.js because it is not yet fully loaded.`
2. **Reachable High Vulnerabilities:**
   - `sharp` (< 0.35.0): Inherited libvips vulnerabilities (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591; GHSA-f88m-g3jw-g9cj).
   - `js-yaml` (4.1.1): Quadratic CPU consumption / DoS in `!!omap` resolution (GHSA-5p4m-2wfm-xmqj).
3. **High/Moderate Vulnerabilities:**
   - `nanoid` (3.3.12): Infinite loop with negative/zero size (CVE-2026-67213, GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8).
   - `postcss` (8.4.31 / 8.5.14): Path traversal in `sourceMappingURL` loading & CSS stringify unescaped style tags (CVE-2026-69153, CVE-2026-41305, CVE-2026-45623, GHSA-r28c-9q8g-f849).

---

## Changes Made

1. **Removed `jose` from `serverExternalPackages` in `next.config.ts`:** Prevented Next.js Webpack from externalizing `jose` as a CJS `require()` call on Node.js server runtimes. Next.js now bundles `jose` natively as an ESM module.
2. **Configured Package Overrides in `package.json`:** Added targeted dependency overrides for `sharp`, `js-yaml`, `nanoid`, and `postcss` to enforce non-vulnerable, safe patch releases.
3. **Regenerated `package-lock.json`:** Executed `npm install` to update the lockfile via standard npm resolution.

---

## Dependency Changes

| Package | Old Version | New Version | Direct/Transitive | Reason |
|---|---|---|---|---|
| `jose` | 6.2.3 | 6.2.3 | Direct | Removed from `serverExternalPackages` so Webpack bundles ESM cleanly. |
| `sharp` | 0.34.5 | 0.35.3 | Transitive (`next`) | Remediated inherited libvips CVEs (GHSA-f88m-g3jw-g9cj). |
| `js-yaml` | 4.1.1 | 4.3.1 | Transitive (`eslint`) | Remediated quadratic CPU DoS vulnerability (GHSA-5p4m-2wfm-xmqj). |
| `nanoid` | 3.3.12 | 3.3.18 | Transitive (`postcss`) | Remediated infinite loop security issue (CVE-2026-67213). |
| `postcss` | 8.4.31 / 8.5.14 | 8.5.26 | Transitive (`next`, `@tailwindcss/postcss`) | Remediated path traversal & XSS advisories (GHSA-r28c-9q8g-f849). |

---

## JOSE Build Fix

### Root Cause
In `next.config.ts`, `jose` was listed in `serverExternalPackages`:
```ts
serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"]
```
Because `jose` v5/v6 is an ESM-only package (`"type": "module"`), externalizing it forced Next.js server builds to emit CommonJS `require("jose")` calls. In Node.js server environments, requiring ES modules synchronously throws an ESM/CommonJS loading error:
`Error: Unexpected module status 0. Cannot require() ES Module`

### Exact Change
Removed `"jose"` from `serverExternalPackages` in `next.config.ts`:
```diff
-  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
+  serverExternalPackages: ["firebase-admin", "jwks-rsa"],
```

### Why the Change is Safe
`jose` is natively written for modern Web APIs and Webpack/Turbopack bundling in Next.js App Router. Allowing Next.js to bundle `jose` as an ES module ensures full compatibility across Node.js server routes and Edge runtimes without altering any JWT verification or signing functionality in `src/lib/auth.ts`.

---

## Semgrep Finding

* **Reported Finding:** `javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring` in `scripts/testPhase2.ts` line 16.
* **Assessment:** The file `scripts/testPhase2.ts` does not exist in the active STASH codebase. Furthermore, `console.error` string interpolation within offline test or development scripts carries no production risk. No application source code changes were required or made.

---

## Validation

* **`npm ls` Checks:**
  - `sharp`: `0.35.3` (>= 0.35.0)
  - `js-yaml`: `4.3.1` (>= 4.3.1)
  - `nanoid`: `3.3.18` (>= 3.3.17)
  - `postcss`: `8.5.26` (>= 8.5.23)
  - `jose`: `6.2.3` (direct) / `4.15.9` (transitive via `firebase-admin`)
* **Production Build (`npm run build`):** Succeeded (`✓ Compiled successfully`, Exit Code 0). All 24 static and dynamic routes compiled without errors.
* **Semgrep Scan (`semgrep scan --config auto`):** Ran 381 rules across 105 files — **0 findings**.
* **`npm audit`:** Remediated all reported target vulnerabilities for `sharp`, `js-yaml`, `nanoid`, and `postcss`.
* **TypeScript & Linting:** TypeScript compilation succeeded during Next.js production build. Pre-existing ESLint warnings/errors in legacy codebase were preserved as instructed.

---

## Remaining Risks

1. **Unused or Transitive Upgrades in Ecosystem:** Future transitive dependency updates in `firebase-admin` or `next` should be monitored via GitHub Dependabot.
2. **Environment Secret Management:** `JWT_SECRET` must be set securely in production environments; the fallback dev key is restricted to non-production environments.
3. **Session Cookie Security:** Production deployment must ensure HTTPS is active so the `secure` flag on the `stash_session` cookie is strictly enforced.
