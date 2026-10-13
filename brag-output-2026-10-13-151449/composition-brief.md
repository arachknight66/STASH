# Hyperframes Composition Brief: STASH

## Objective
Create a short, dead-serious fintech launch brag for STASH, treating a logged $6.50 boba as the product's headline achievement.

## Output
- Composition directory: `brag-output-2026-10-13-151449/composition/`
- Rendered video: `brag-output-2026-10-13-151449/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/home/arachknight/Documents/Projects/Personal/STASH`
- Primary files read: `README.md`, `app/src/app/page.tsx`, `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/components/pages/DashPage.tsx`, `app/src/components/pages/BudgetsPage.tsx`
- Product name: STASH
- Tagline / strongest claim: “GET STASHED. NOT STRAPPED.”
- Key UI or visual moment to recreate: the landing page's interactive phone sandbox; click “Log $6.50 Boba,” update $12,450.00 to $12,443.50, and prepend “Matcha Latte” to Recent Ledger.
- Copy that must appear verbatim:
  - “GET STASHED. NOT STRAPPED.”
  - “INTERACTIVE PRODUCT SANDBOX”
  - “Liquidity Vault”
  - “Bali Getaway” / “84% Saved”
  - “Log $6.50 Boba”
  - “Strict Privacy (Zero Bank Syncs)”
  - “NO SPREADSHEETS” (README phrase)

## Creative Direction
- Tone preset: yc-parody
- Creative direction: tiny impulse purchase, treated like an institutional finance breakthrough
- Interpretation: composed, serious framing with restrained motion and dry UI sounds; STASH's own Gen Z copy provides the humor.
- Angle: Show STASH doing its actual job in the interactive sandbox: one $6.50 boba is logged, balance updates, ledger receives Matcha Latte. Frame it as serious finance.
- Hook: the product's “GET STASHED. NOT STRAPPED.” headline.
- Outro / punchline: “NO BANK LOGINS. NO SPREADSHEETS.” then STASH.
- Avoid: generic SaaS language, abstract filler visuals, unrelated visual redesign, invented finance claims.

## Visual Identity
- Background: #f6f6f6
- Text: #0c0f0f
- Accent: #cafd00; secondary #bba2ff and #ffbdf3
- Display font: Space Grotesk
- Body font: Plus Jakarta Sans
- Visual references: black-bordered phone sandbox, lime controls, pink savings card, neo-brutalist shadows and grid.

## Storyboard
Use `brag-plan.md` as the creative contract.

1. Institutional-grade boba — 3s — exact hero hook.
2. The vault — 4s — recreate actual demo phone and values.
3. One tap — 4s — simulate click on the source button.
4. Receipt, meet reality — 5s — update balance and insert ledger row.
5. The thesis — 4s — grounded close: zero bank logins, no spreadsheets, STASH.

## Audio
- Audio role: restrained parody bed with sparse professional accents.
- Audio arc: understated upbeat business music, a UI click, a soft result accent, quiet fade.
- Music: `assets/music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: 0.18 volume, gentle fade-in, low under all copy, fade out at end.
- Music cue guidance: bundled preset `/home/arachknight/.codex/skills/brag/assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`; tempo 114.84 BPM; optional strong cues 3.70s, 10.54s, 19.48s.
- Audio-reactive treatment: subtle movement in existing lime vault accents only.
- Audio-coupled moments: headline landing, simulated click, balance/ledger result, final wordmark.
- SFX selection guidance: sparse dry click plus a soft reveal sound; use matching UI/impact assets with restrained levels.
- SFX analysis guidance: `/home/arachknight/.codex/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: choose filenames, timestamps, density, and level to fit implemented animation.
- Audio files: copy selected music/SFX into `composition/assets/`.

## Hyperframes Instructions
Use the current Hyperframes composition and animation conventions. This brag workflow owns the product angle, copy, visual identity, storyboard, and delivery. Hyperframes owns concrete layout mechanics, scene timing details, transitions, animation mechanics, SFX choice, and render workflow.

Show the actual sandbox UI with source-grounded numbers. Do not expose secrets or personal data. Use local media. Run `npx hyperframes check` before rendering. Keep narration disabled.
- Audio-reactive extraction note: the available Hyperframes plugin docs describe audio-reactive support but no extraction helper is present in the installed skill bundle, so this version uses a restrained static bed and no audio-reactive visuals.
