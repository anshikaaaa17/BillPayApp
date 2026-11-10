# Progress Log — BillPayApp (CCDS26-0127)

Last updated: 2026-09-13

## Snapshot

Backend is substantially built (auth, bills, payments, categorization, insights, Plaid sandbox). Frontend screens all exist and appear wired to a real API client. Project Plan/Strategy has been submitted; Dr Gu's review comment asked for an earlier, more explicit data-sourcing and data-synthesis plan. That work is in progress but **not yet wired into the production code** — see checklist below.

## Checklist — Data Plan (Dr Gu's feedback: data source/set, real-time vs batch, retrieval/access, synthesis, evaluation)

| # | Item | Status |
|---|---|---|
| 1 | Data source identified | ✅ Done — public bank GIRO/bill-payment payee directories (DBS, HSBC, UOB). DBS's list already groups real SG billers into ~9 categories close to BillPay's own 8. |
| 2 | Real-time vs batch answered | 🔲 Pending — not yet answered anywhere (chat, code, or submitted plan). Needs one paragraph: registry is static/batch-curated; categorization itself runs real-time per-request. |
| 3 | Retrieval / access confirmed | ✅ Done (informally) — GIRO payee lists are public PDFs/pages, no login needed. Not yet written into the plan. |
| 4 | Data synthesis method, literature-grounded (Dr Gu's bias concern) | ⚠️ **Claimed done, actually incomplete** — see below. |
| 5 | Experiment/evaluation plan for the data | ⚠️ Partial — `/categorize/evaluate` + `train_model.py`'s held-out split and 5-fold CV cover the mechanics, but this hasn't been written up as a direct answer to "how does the experiment perform with your data." |
| 6 | All of the above written into the actual submitted document | 🔲 **Not done** — this entire discussion exists only in chat. `ProjectPlan.pdf` (the version with Dr Gu's tracked comment) does not yet contain any of it. |

### The literature-grounding gap (important — flag before telling Dr Gu this is resolved)

The plan was to replace hand-invented corruption rules with methods grounded in Damerau (1964), Kukich (1992), Belinkov & Bisk (2018), and company-name entity-matching research (random single-edit-type typos on QWERTY-adjacent keys; randomized abbreviation strategy instead of "always first word"). **The uploaded `generate_dataset.py` still has the old, hand-invented versions** — `typo()` always swaps the same two adjacent letters, `truncate()` always takes the first word. `single_edit_error()` and `abbreviate()` (the literature-grounded replacements) don't exist in this file. This needs to actually be implemented before citing the literature to Dr Gu — right now the citation would describe code that isn't there.

### Category taxonomy mismatch (new, found while reviewing the uploaded files)

`generate_dataset.py`'s registry (40 billers) uses **different category names** than the production categorizer:

- `generate_dataset.py`: Utilities, Telecoms, Insurance, Education, Government, Entertainment & Subscriptions, Credit Cards, Town Councils & Community
- `billpay_backend/ml/categorizer.py`'s `BILLER_REGISTRY` (45 billers, the one actually running in the app): Utilities, Telecoms, Finance, Insurance, Housing, Entertainment, Education, Transport

These need to be reconciled to one canonical 8-category scheme before the CSV is usable for training the real model.

### Integration gap (new, found while reviewing the uploaded files)

`train_model.py` reads `biller_training_data.csv` and saves a fitted pipeline to `categorizer_stage2.joblib`. The production `categorizer.py` **does not load either of those** — it builds its own training data internally from `BILLER_REGISTRY` (just lowercase + first-word variants, no typos) and saves to a completely different path, `ml/categorizer.pkl`. Right now the new dataset/training work is a disconnected side project; it has no effect on what the running app actually predicts until it's wired in.

**To close this out:** (a) pick one category scheme and use it in both files, (b) actually implement `single_edit_error()`/`abbreviate()` in `generate_dataset.py`, (c) point `categorizer.py`'s `get_model()` at the CSV-trained `categorizer_stage2.joblib` (or fold `build_training_data()` into calling `generate_dataset.py`'s logic), (d) write the resulting source/synthesis/evaluation answers into the Project Plan document. Say the word and I'll do all four.

## Checklist — App Build (per Sep 2026 schedule)

| Schedule item (per submitted plan, Section 8) | Target week | Status |
|---|---|---|
| Fix standing issues (config, .gitignore, git hygiene) | 24–30 Aug | 🔲 Not confirmed done — `src/services/api.js` still likely has the hardcoded LAN IP per last review; git history still just "Initial commit" as of last check. |
| Finalize schema and tables | 7–13 Sep | ✅ Appears done — 6 SQLAlchemy models exist (`User`, `Biller`, `LinkedBiller`, `Transaction`, `WalletTopUp`, `MLLabel`). |
| Auth, bills, payments routers wired to DB | 14–20 Sep | ✅ Appears done — all three routers exist and are registered in `main.py`. |
| All 5 FastAPI routers functional; registry 45→55 | 21–27 Sep | ⚠️ Routers: done (6 registered, including `insights` and `plaid`). Registry: still at 45, not yet grown to 55. |
| Two-stage categorizer functional + unit tests | 28 Sep–4 Oct | ⚠️ Two-stage logic works in `categorizer.py`. No dedicated unit test file found. The new literature-grounded typo/abbreviation generator (this session's topic) is not yet finished or integrated — see Data Plan checklist above. |

## Done / working (per code review)

## Done / working (per code review)

- **Auth**: register, login (bcrypt password hashing), Google OAuth stub, OTP-based password reset (in-memory OTP store). `billpay_backend/routers/auth.py`.
- **Database models**: User, Biller, LinkedBiller, Transaction, WalletTopUp, MLLabel via SQLAlchemy + SQLite. `billpay_backend/models/database.py`.
- **Bills**: list all billers, link/unlink a biller account, fetch "outstanding" amounts via a mock biller API (simulated latency + 2% failure rate). `billpay_backend/routers/bills.py`.
- **Payments**: pay a bill (wallet or direct), wallet top-up, transaction history. Runs each payment through the ML categorizer and stores category + confidence. Mock payment gateway with simulated 5% failure rate. `billpay_backend/routers/payments.py`.
- **ML categorization engine**: hybrid rule-based (biller registry, ~45 known billers across 8 categories) + TF-IDF/LogisticRegression fallback for unknown billers, with confidence scoring and an `/evaluate` endpoint (accuracy, CV score, confusion matrix) for the FYP report. `billpay_backend/ml/categorizer.py`.
- **Insights**: spend-by-category, ML accuracy stat, sample data fallback when user has no transactions yet. `billpay_backend/routers/insights.py`.
- **Plaid sandbox integration**: link token creation, public/access token exchange, transaction fetch + category mapping, sandbox bank connect (First Platypus Bank), ML-vs-Plaid accuracy comparison. `billpay_backend/plaid_router.py`, `plaid_service.py`.
- **Frontend**: full screen set exists — Login, Register, ForgotPassword, Home, Pay, LinkBiller, LinkBank, Confirm, TopUp, History, Insights, Profile — with navigation wired in `App.js` (auth stack vs main tab/stack based on `AuthContext`). API client (`src/services/api.js`) targets the FastAPI backend.

## Not yet verified / likely incomplete

- No evidence the backend has actually been run end-to-end against the Expo app in this environment (no test run performed yet as of this log).
- `evaluate_model()` / `/categorize/evaluate` — worth running once to get real accuracy numbers for the report, rather than assuming the demo `_sample_insights()` numbers.
- Plaid integration currently only tested against sandbox `First Platypus Bank`; real bank flow (Plaid Link UI in the RN app) not confirmed.
- `LinkBankScreen.js` exists in two places (`src/screens/` and `plaid_integration/`) — need to confirm which is actually wired into `App.js` and which is stale.
- Google OAuth (`/auth/google`) doesn't verify the token server-side yet (comment in code says "in production, verify with Google" — not implemented).

## Known issues / cleanup backlog

- Hardcoded LAN IP in `src/services/api.js` (`10.21.32.77`) — needs updating per dev machine/network.
- `.env` with real Plaid sandbox secret is untracked in git — good for now, but must land in `.gitignore` before first real commit of the backend.
- Repo is mostly uncommitted (only "Initial commit" exists; `billpay_backend/`, `src/`, `plaid_integration/` all untracked).
- Leftover zips (`billpay_backend.zip`, `plaid_integration.zip`) and `.ps1` setup scripts at repo root — candidates for cleanup once confirmed unneeded.
- Possible duplicate Plaid code between `billpay_backend/` and `plaid_integration/` — needs reconciling.

## Official FYP timeline (CCDS SC4079, AY2026/2027 Sem 1)

Source: department "Dates Aug 2026" circular + supervisor allocation email.

| Date | Milestone |
|---|---|
| 10 Aug 2026 (Sem1 Wk1) | FYP officially starts (unofficial early start encouraged — short winter break) |
| 31 Aug 2026 (Sem1 Wk4) | Submit Project Plan/Strategy to supervisor (Dr Gu Chloe) |
| 25 Jan 2027 (Sem2 Wk3) | Submit Interim Report |
| 22 Mar 2027 (Sem2 Wk10) | Submit Final Report (to supervisor + examiner) |
| 16 Apr 2027 (Sem2 Wk13) | Submit Amended Final Report (final — also upload to DR-NTU) |
| 7, 10–12 May 2027 | Oral Presentation (20 min + 10 min Q&A) |

**Project Plan/Strategy (first milestone, due 31 Aug 2026):** there's no separate standalone template for this on the CCDS FYP portal — it's submitted directly to the supervisor after consultation. The one hard requirement per the official Report Guide: it must include a chart-form project schedule (e.g. Gantt chart) covering the full FYP duration, since this same schedule gets reused later in the Final Report's "Project Schedule" section (with deviations noted if the actual work diverges). Worth asking Dr Gu Chloe directly if she has a preferred format/template for the plan itself.

## Administrative notes

- **Oral exam**: compulsory, 20 min presentation + 10 min Q&A. Missing it without an MC = automatic zero for that component. Illness must be reported to SCE General Office within 24 hrs with MC + Medical Report Form.
- **DR-NTU library submission**: one electronic copy, submitted once only, any time before oral once the report is finalized (no edits after). Must strip personal data (NRIC/address/phone) per PDPA. Embargo possible with Dr Gu Chloe's endorsement if needed.
- **Claimable FYP expenses**: software/licenses and NTU internal compute rental (HPC) are claimable. Laptops, printers, internet/subscriptions, and web/app dev services are explicitly non-claimable — don't expect reimbursement for things like a Plaid production plan or hosting.
- **GPU cluster access**: not relevant to this project — the ML categorizer is a lightweight scikit-learn TF-IDF + LogisticRegression pipeline, no GPU needed.

## Milestone log

- 2026-07-07 — Reviewed the full codebase and created this progress log. No code changes made yet.
- 2026-07-15 — Logged official FYP timeline (project plan, interim/final/amended reports, oral presentation dates); set up reminders ahead of each deadline.
- 2026-07-15 — Drafted `Project_Plan_CCDS26-0127.docx` (objectives, methodology, progress-to-date, Aug 2026–May 2027 schedule, deliverables, risks) — draft, not yet reviewed by Dr Gu Chloe. Due 31 Aug 2026.
- 2026-07-15 — Revised the plan: added a system architecture diagram (Figure 1) and expanded the methodology section (ML categorization two-stage logic, payment request flow, data model) for more technical depth.
- 2026-07-15 — Redrew Figure 1 in a layered dark-theme style (Frontend/Backend/ML Engine/Data Layer/External) and added Figure 2, a step-by-step Plaid "Connect Bank" sequence diagram ending in the ML-vs-ground-truth accuracy comparison used for FYP evaluation.
- 2026-07-16 — Added new opening Section 1 "Strategy and Approach": plain-language Q&A (what am I doing / purpose / real-world applicability / is ML involved and how) ahead of the technical sections, per feedback that the doc didn't clearly explain the overall strategy.
- 2026-07-16 — Restructured Section 4.1 diagrams into a zoom-in/zoom-out sequence per supervisor's presentation guidance: Figure 1 (birds-eye, whole app in one glance), Figure 2 (zoomed-out deployment context: phone / my server / external cloud), Figure 3 (zoomed-in detailed components, previously the only diagram), Figure 4 (Plaid flow detail, unchanged).
- 2026-07-16 — Rewrote Sections 1-3 (Strategy, Problem Statement, Objectives) to be concrete instead of generic: grounded in actual SG billers (SP Power, Singtel, NTU Fees), the categorizer's own test cases ("SP Power Pte Ltd", "Unknown Merchant XYZ"), and measurable targets (grow registry 45→80-100 billers, ≥70% ML fallback accuracy on held-out biller names).
- 2026-07-28 — Rewrote Section 1 from informal Q&A bullets into professional prose with proper subsections (1.1-1.4); added researched background on Plaid (Enrich product) and Envestnet|Yodlee (Transaction Data Enrichment) as real commercial benchmarks; added new Section 4.8 "Development Methodology" explicitly naming and justifying the SDLC model (iterative-incremental, Agile-inspired — not pure Scrum or Waterfall). Saved as `Project_Plan_CCDS26-0127_v2.docx` since the original filename was locked (likely open in Word) — merge/replace once closed.
- 2026-08-05 — Added new Section 4.1a "GUI Wireframes": five phone-frame mockups (Login, Home, Link/Pay, Confirm Payment, Insights) styled after the navy/gold AmexBuddy hackathon deck template, shown as Figure 4, tied explicitly back to the real implemented screens rather than proposed new ones. Plaid flow diagram renumbered to Figure 5. Saved into `Project_Plan_CCDS26-0127_v2.docx` (original filename still locked, likely open in Word — merge once closed).
- 2026-08-05 — Pivoted the 31 Aug submission from Word to PowerPoint per feedback that the docx wireframes read as unpolished. Rebuilt the entire Project Plan as `BillPay_Project_Plan.pptx` (21 slides), literally reusing the AmexBuddy hackathon deck's own colors/typography (navy #16233F, gold #C9A227, extracted directly from its slide XML, not eyeballed) and its layout language — numbered-circle agenda, checklist rows, colored two-stage pipeline bars, comparison table, 3-card problem statement, stat callouts, "day in life" numbered flow, phased-roadmap cards for the schedule, navy value-prop cards for resources, title/closing slides. Covers all of Sections 1-9 from the docx plus the wireframes (now a single 5-across strip, `wireframes3.png`). Saved to `BillPay_Project_Plan.pptx`. The docx (`Project_Plan_CCDS26-0127_v2.docx`) remains in the folder as a backup but is no longer the primary submission format.
- 2026-08-06 — Expanded the deck from 21 to 31 slides per detailed CS-examiner-style feedback that it read as a product pitch rather than an SDLC-grounded FYP. Added: SDLC Overview (7-stage lifecycle), Requirements Analysis (functional/non-functional), a Use Case Diagram (actor + 7 use cases), a Layered Architecture slide (Presentation/Business Logic/ML/Data/External), a Data Model Class/ER diagram (6 SQLAlchemy entities with PK/FK fields and relationships), a UML Sequence Diagram for the payment flow (5 lifelines, 8 messages, replacing the old "day in the life" slide), a UML Activity Diagram (decision-branch flowchart for insufficient-balance handling), an API Design slide (11 REST endpoints), a reworked Development Methodology slide (iteration → deliverable → status table instead of just justifying the SDLC choice), a Testing Strategy slide (unit/integration/system/ML/performance/UAT), a Security Considerations slide (including an honest callout on the OTP-in-response limitation), a Deployment Architecture slide (today's local sandbox stack plus a noted production path), and an expanded Risks table (4 project risks + 4 technical risks). Saved as `BillPay_Project_Plan_v2.pptx`. All 31 slides validated (schema + visual QA via rendered JPGs) with no overflow/overlap issues.
- 2026-09-13 — Reviewed uploaded `train_model.py`, `generate_dataset.py`, `biller_training_data.csv` against the actual production `categorizer.py` and the submitted `ProjectPlan.pdf` (with Dr Gu's tracked comment on data planning). Found: the literature-grounded typo/abbreviation generator described in chat isn't actually in the uploaded `generate_dataset.py` (still the old fixed-rule version); the new dataset's category taxonomy doesn't match `BILLER_REGISTRY`'s; and the new training pipeline (`biller_training_data.csv` → `categorizer_stage2.joblib`) isn't wired into `categorizer.py` at all. Logged as a checklist at the top of this file — nothing fixed yet, awaiting go-ahead.
- 2026-08-10 — Applied round-2 feedback on the annotated `BillPay_Project_Plan_v2.pptx`. SDLC Overview: removed the "(Section X)" cross-reference tags from the 7-stage list. Deck-wide font floor raised to 10.5pt (was 9.5pt in places) — a handful of space-constrained diagram labels (sequence-diagram message text) kept at 10pt to avoid wrapping. Slides 5, 6, 7, and 9 reworded/expanded in place to directly answer the user's conceptual questions rather than only explaining in chat: Strategy slide now says "Already built and working" with the FastAPI/SQLite backend and frontend screens both already running pre-FYP-start; Benchmarks slide adds a callout clarifying Plaid is used only for sandbox open-banking (transaction fetch) and as an independent ground-truth label source for benchmarking — not for categorization itself, which is this project's own engine; Two-Stage Pipeline slide adds a plain-language TF-IDF + Logistic Regression explainer box; Objectives slide clarifies "Benchmark against Plaid" and "Realistic API simulation" bullets. Architecture diagrams (Birds-Eye, Zoomed Out, Zoomed In) regenerated from dark to light background theme with larger diagram text (new `gen_light_diagrams.py`), addressing the "font too small / use light background" feedback on slides 11, 12, 14. Full visual QA pass across all touched slides (Class/ER, Sequence, Activity, Project Schedule redesign included) — no overflow, wrap, or overlap issues found. Content-placeholder grep and schema validation both passed clean. Saved as `BillPay_Project_Plan_v3.pptx`.

---
*Update this file after each meaningful work session: move items between sections, add a dated line under Milestone log.*
