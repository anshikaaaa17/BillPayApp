# BillPayApp — Code Walkthrough (living notes)

Project: FYP CCDS26-0127 — Integrated Bill Payment App with Smart Categorization
Owner: Anshika Uppal | Supervisor: Dr Gu Chloe

How to use this file: one section per area. Each has a status line. Update the status as you understand each part, and add your own notes under "My notes".

Status key: ✅ walked through and understood | 📖 read through, not yet walked through in detail | ❓ not yet opened

---

## 0. The big picture

Two programs run at the same time:

- **Phone app** (`App.js`, `src/`) — React Native + Expo. What the user sees.
- **Server** (`billpay_backend/`) — FastAPI + SQLite. Holds the data and does the thinking.

The phone app never touches the database. It sends requests to the server through `src/services/api.js`, which holds the server's address (`BASE_URL`, currently a hardcoded laptop IP).

Run the server: `python -m uvicorn main:app --reload --port 8000` from inside `billpay_backend/` (use `python -m`, so the server uses the same Python where you installed `requirements.txt`; bare `uvicorn` once picked an old Python 3.8 with the wrong scikit-learn and crashed the ML). Install with `python -m pip install -r requirements.txt`. Tested setup: Python 3.14, scikit-learn 1.8.0. API docs at `http://localhost:8000/docs`.

My notes:
-

---

## 1. App navigation — `App.js`

Status: 📖

- If nobody is logged in → **AuthStack**: Login, Register, ForgotPassword.
- If logged in → **AppStack**: bottom tabs (Home, Pay, Insights, History, Profile) plus pop-ups (Confirm, TopUp, LinkBiller) and PersonalDetails / ChangePassword.
- The switch is `user ? <AppStack /> : <AuthStack />`, where `user` comes from `AuthContext`.
- **Loose end:** `LinkBankScreen.js` exists but `App.js` never imports it, so the Plaid "connect bank" screen is not reachable from the app yet.

### 1a. `App.js` explained part by part

`App.js` is the app's entry point and screen organiser. It decides which screens a user sees, sets up navigation, and makes theme and login information available everywhere. The content of each screen lives in separate files under `src/screens/`.

**1. Imports: bringing in the building blocks**

| Import | Purpose |
|---|---|
| `React` | Needed to define components (`MainTabs`, `AppStack`, `App`) |
| `StatusBar` (expo-status-bar) | Controls the phone's top status bar appearance |
| `NavigationContainer` | Holds and manages the app's navigation |
| `createNativeStackNavigator` | Screens that open on top of one another, with a back action |
| `createBottomTabNavigator` | The bottom navigation tabs |
| `SafeAreaProvider`, `useSafeAreaInsets` | Avoid overlap with device edges and system controls |
| `Ionicons` | Icons such as home, card and person |
| `ThemeProvider`, `useTheme` | Gives access to the app's theme (colours) |
| `AuthProvider`, `useAuth` | Gives access to who is logged in |
| Screen imports | The individual pages. `import HomeScreen from "./src/screens/HomeScreen"` means "load the Home screen from this local file" |

**2. Two kinds of navigation**
```js
const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
```
- **Stack** is like a pile of pages: opening Personal Details places it on top, going back removes it.
- **Tab** lets the user switch between the five main sections: Home, Pay, Insights, History, Profile.

**3. `TAB_ICONS`:** each tab has two icons, an *active* one (filled, when selected) and an *inactive* one (outline). Home uses a filled house when selected and an outlined house otherwise.

**4. `MainTabs()`: builds the bottom navigation bar**
- `const { t } = useTheme();` gets the theme colours (`t`). `const insets = useSafeAreaInsets();` gets the space needed around the device's safe area.
- `<Tab.Navigator screenOptions={({ route }) => ({ ... })}>` creates the tab bar. `screenOptions` supplies settings for its screens, and `route` identifies which tab is being configured.
- `headerShown: false` hides the default header. `tabBarActiveTintColor` / `tabBarInactiveTintColor` set the selected and unselected colours.
- `tabBarLabelStyle` styles the text under each icon (size 10, weight 500).
- **Making room for phone controls:** `paddingBottom: insets.bottom` and `height: 60 + insets.bottom`. If `insets.bottom` is 24 (e.g. the iPhone home indicator), the bar height becomes 60 + 24 = 84, so the system bar doesn't sit on top of the tabs and swallow taps.
- **Choosing the icon:** `tabBarIcon: ({ focused, color }) => ...` looks up `TAB_ICONS[route.name]` and shows `focused ? icons.active : icons.inactive` ("if selected, the active icon, otherwise the inactive one").
- `<Tab.Screen name="Home" component={HomeScreen} />` connects the name "Home" to the real `HomeScreen`. The other four lines do the same.

**5. `AppStack()`: screens available after login**
The first screen, `Main`, is the five-tab interface. Other screens open above it:

| Screen | How it is configured |
|---|---|
| Confirm, TopUp, LinkBiller | Modal presentation (`options={{ presentation: "modal" }}`); exact look depends on the platform |
| PersonalDetails, ChangePassword, ForgotPassword | Standard stack screens |

From any screen, `navigation.navigate("TopUp")` opens the registered Top Up screen.

**6. `AuthStack()`: screens available before login**
Login, Register and ForgotPassword. Login is listed first, so it is the starting screen. `ForgotPasswordScreen` is registered in both stacks so it can be reached whether or not the user is logged in.

**7. `RootNavigator()`: choose the flow based on login**
- `const { user } = useAuth();` reads the current user from the login context.
- The key line is `{user ? <AppStack /> : <AuthStack />}`: if `user` has a value, show the main app; if it is empty (`null`), show Login / Register / Forgot Password. When the login context changes `user`, React re-renders and switches flow automatically.
- `<NavigationContainer>` provides the navigation infrastructure. `<>...</>` is a React Fragment that groups elements without adding a visible container.
- `<StatusBar style="light" />` sets the status bar text and icons to light. It does not make the whole app light mode.
- This file only *checks* login state; the real login logic is in `AuthContext` and the login screen.

**8. `App()`: wrap everything in shared providers**
```
SafeAreaProvider  →  ThemeProvider  →  AuthProvider  →  RootNavigator
```
A provider makes shared information available to everything inside it. Because `RootNavigator` sits inside all three, it and its descendants can call `useTheme()` and `useAuth()`.

**Overall flow:** start the app → load the shared providers → check `user` → show the login screens, or the main app with five tabs.

**Small observation:** in `RootNavigator`, `const { mode } = useTheme();` is read but never used, and the status bar is always `"light"` regardless of theme. Harmless, but tidy-up item C7 in section 12.

My notes:
-

---

## 2. Login state — `src/context/AuthContext.js`, `ThemeContext.js`

Status: ❓

Remembers who is logged in; `App.js` reads it. ThemeContext handles colours / dark mode.

My notes:
-

---

## 3. Screens — `src/screens/`

Status: ❓ (file list only, none opened yet)

| Screen | Purpose (to confirm) |
|---|---|
| Login / Register / ForgotPassword | Email login, sign-up, OTP password reset |
| Home | Wallet balance and summary |
| Pay / Confirm | Choose a biller, enter amount, confirm payment |
| LinkBiller | Link a biller account |
| LinkBank | Plaid bank connect (not wired into App.js) |
| TopUp | Add money to wallet |
| History | Past transactions |
| Insights | Spending by category |
| Profile / PersonalDetails / ChangePassword | Account settings |

My notes:
-

---

## 4. Talking to the server — `src/services/`

Status: ❓

- `api.js` — the HTTP client and `BASE_URL`.
- `authService.js`, `billService.js`, `paymentService.js`, `insightService.js`, `mlService.js`, `PlaidService.js` — one per route group. `mlService.js` now has only `categorize(billerName)` (used by PayScreen); the unused `getEvaluation()` was removed along with the `/categorize/evaluate` endpoint.
- `database.js` — local SQLite on the phone (purpose to confirm).

**Known issue:** `BASE_URL` is hardcoded to a laptop IP and breaks when the network changes. Move to an env var or config.

My notes:
-

---

## 5. Server entry point — `billpay_backend/main.py`

Status: 📖

Starts FastAPI, allows the phone app to call it (CORS), and plugs in six route groups:

| Prefix | File | What it does |
|---|---|---|
| `/auth` | `routers/auth.py` | register, login, Google login, OTP reset, profile, change password |
| `/bills` | `routers/bills.py` | list billers, link / unlink, outstanding amounts (mock biller API) |
| `/payments` | `routers/payments.py` | pay a bill, wallet top-up, history |
| `/categorize` | `routers/categorize.py` | categorize a name (`POST /` only; `/evaluate` and `/retrain` removed, training is in the notebook) |
| `/insights` | `routers/insights.py` | spending by category, monthly totals |
| `/plaid` | `plaid_router.py` | bank connect, fetch transactions, ML-vs-Plaid accuracy |

**Resolved:** `main.py` never calls `create_tables()`, but both seed scripts do (`seed_billers.py` line 82, `seed_demo_user.py` line 53). So a fresh database needs a seed script run once before the server is useful. See section 6.

My notes:
-

---

## 6. Database — `billpay_backend/models/database.py`

Status: 📖

SQLite file `billpay.db`, accessed through SQLAlchemy. Tables:

- **User** — name, email, password hash, wallet balance, provider (email / google)
- **Biller** — catalogue of billers (code, name, category, icon, colour)
- **LinkedBiller** — a user's account with a biller
- **Transaction** — each payment, including the category, ML confidence and ML method assigned to it
- **WalletTopUp** — wallet top-ups
- **MLLabel** — ground-truth labels for evaluating the ML

`get_db()` gives each request its own database session.

### 6a. Where the database lives

- One file: `billpay_backend/billpay.db`. SQLite is built into Python, so nothing is installed and no database server runs.
- The path in `database.py` is relative (`sqlite:///./billpay.db`): the server uses the `billpay.db` in the folder it was **started from**. Always start `uvicorn` from inside `billpay_backend/`, otherwise it silently creates a new empty database elsewhere.
- Ignored by git (`*.db` in `.gitignore`) because it holds user emails and password hashes.
- Snapshot when checked (read-only count): users 5, billers 20, linked_billers 4, transactions 7, wallet_topups 2, ml_labels 0. The billers table has 20 rows although the registry has 45 — likely seeded when the list was shorter.

### 6b. How the tables get created and filled

1. Each table is a Python class in `models/database.py` (User, Biller, ...).
2. `create_tables()` calls `Base.metadata.create_all(...)`, which builds any missing tables inside `billpay.db` and leaves existing ones alone.
3. The server (`main.py`) does **not** call it. The seed scripts do:
   - `python seed_billers.py` — fills `billers` from `BILLER_REGISTRY` in `ml/categorizer.py` (so the app's biller list and the ML rule table are the same 45 names). Run from inside `billpay_backend/`.
   - `python seed_demo_user.py` — creates one demo account with real rows (linked billers, transactions, top-ups). Each transaction is categorized by the real ML engine. If the demo user already exists it **deletes that user and their data and recreates them**.
4. `seed_billers.py` is safe to re-run: it matches rows by `biller_code`, adds missing ones, updates changed ones and leaves stale ones alone (details in section 8a). It is run manually: `python seed_billers.py` from inside `billpay_backend/`.

### 6c. How to view the data

- **DB Browser for SQLite** (free, sqlitebrowser.org): Open Database → `billpay.db` → Browse Data tab → pick a table. Don't click Write Changes. Close it before starting the server so the two don't fight over the file.
- The server's docs page, `http://localhost:8000/docs`, runs the routes directly (e.g. `/payments/history/1`).
- Python one-liner from inside `billpay_backend/`: `python -c "import sqlite3; c=sqlite3.connect('billpay.db'); print(c.execute('select id,name,email,wallet_balance from users').fetchall())"`

**Setting up on a new laptop** (DB Browser is a desktop app, so `requirements.txt` cannot install it):
1. Install Python (3.14 tested), Node.js, and Git.
2. Install DB Browser for SQLite from https://sqlitebrowser.org/dl/ (optional, only for viewing data).
3. `cd billpay_backend`, then `python -m pip install -r requirements.txt` (includes JupyterLab, matplotlib, seaborn for the notebook).
4. Create `.env` yourself (it is not in git); `billpay.db` is also not in git, so run `python seed_billers.py` and `python seed_demo_user.py` to rebuild the data.
5. Start the server: `python -m uvicorn main:app --reload --port 8000`. Notebook: `python -m jupyterlab` from the project folder.
6. Phone app: `npm install`, then `npx expo start`, and update `BASE_URL` in `src/services/api.js` to the new laptop's IP.

### 6d. CRUD — how each table's data is Created, Read, Updated, Deleted

CRUD = Create, Read, Update, Delete: the four things an app does with stored data.

| Table | Create | Read | Update | Delete |
|---|---|---|---|---|
| **users** | `POST /auth/register` (email signup); `POST /auth/google` (first Google login) | `POST /auth/login`; `GET /auth/user/{id}` | `PUT /auth/user/{id}` (name, phone); `POST /auth/change-password`; `POST /auth/reset-password` (via OTP); wallet balance changes on pay / top-up | No route. Only `seed_demo_user.py` deletes (the demo user). `is_active` exists and login refuses inactive users, but nothing sets it to false. |
| **billers** | `seed_billers.py` only | `GET /bills/all` | Re-run seed script | No route |
| **linked_billers** | `POST /bills/link` (blocks duplicate active links) | `GET /bills/linked/{user_id}`; `GET /bills/outstanding/{user_id}` | — | `DELETE /bills/unlink/{id}` is a **soft delete**: it sets `is_active = False`; the row stays in the table. Reads filter on `is_active == True`. |
| **transactions** | `POST /payments/pay` (category, confidence, method come from the ML categorizer) | `GET /payments/history/{user_id}`; `/insights/...` | — (payments are never edited) | No route |
| **wallet_topups** | `POST /payments/topup` | not listed back by any route I've seen | — | No route |
| **ml_labels** | **Nothing writes to it** (no code references `MLLabel` outside the model definition) | — | — | — |

Things that are **not** in the database:
- **OTP codes** for password reset live in a Python dictionary (`OTP_STORE`) in memory. They expire after a few minutes and vanish when the server restarts.
- **Plaid access tokens** live in an in-memory dictionary (`PLAID_TOKENS`) and are lost on restart.
- **The ML model** is a file (`ml/categorizer_stage2.joblib`), not a table.

### 6e. One payment, start to finish (what changes in the database)

1. App calls `POST /payments/pay`.
2. Server reads **users** (does this user exist? is the wallet balance enough?).
3. ML categorizer returns category + confidence + method.
4. Mock gateway runs (5% random failure; on failure nothing is saved).
5. Server **updates** `users.wallet_balance` (wallet payments only) and **creates** one row in `transactions`, in a single commit.
6. Later, History reads `transactions`; Insights reads `transactions` and groups by `category`.

### 6f. Things worth knowing / possible gaps

- No delete or deactivate route for users: a user can never remove their account (worth stating as a limitation or future work).
- `ml_labels` is never written, so the ground-truth table is unused today.
- Payments and top-ups can't be edited or deleted, which is normal for financial records.
- Unlinking keeps history (soft delete), so old transactions still refer to the biller.

My notes:
-

---

## 7. What happens when you pay a bill — `routers/payments.py`

Status: 📖

1. App sends user id, biller, amount, payment method to `POST /payments/pay`.
2. Server checks the user exists; for wallet payments, checks the balance.
3. Calls `categorize(biller_name)` → gets category, confidence, method.
4. Calls a **mock gateway** (random delay, fails 5% of the time on purpose).
5. On success: deducts the wallet (if wallet payment) and saves a Transaction with the category.
6. History and Insights later read those saved transactions.

Step 3 is where the ML categorizer plugs in.

My notes:
-

---

## 8. The ML categorizer — `billpay_backend/ml/categorizer.py`

Status: 📖

**Stage 1 — rule lookup** (`rule_based_categorize`): looks in `BILLER_REGISTRY` (45 billers, 8 categories). Exact match → confidence 1.0; case-insensitive → 1.0; partial ("contains") match → 0.85.

**Stage 2 — ML fallback**: if Stage 1 has no match, a TF-IDF (character n-gram) + Logistic Regression model guesses from the letters. Confidence ≥ 0.5 → method `ml`; below → `ml_low_confidence`.

**The file is now load-only (done, tested 22 Oct 2026).** It never trains. Key parts:
- `MODEL_PATH` — absolute path built from the file's own location: `ml/categorizer_stage2.joblib`.
- `load_model()` — loads the joblib; if the file is missing it raises `FileNotFoundError` telling you to train in the notebook (no silent retraining).
- `get_model()` — loads once, then reuses the cached model.
- `rule_based_categorize()` / `categorize()` — unchanged; `categorize()` is used by `/categorize` and `/payments/pay`.
- `python -m ml.categorizer` (from `billpay_backend/`) just loads the model and prints 7 sample predictions.

**Removed:** `build_training_data()`, `train_model()`, `evaluate_model()`, `/categorize/evaluate`, `/categorize/retrain`, and the unused sklearn/pandas imports.

**Where training lives now:** `notebooks/BillPay_Stage2_Training.ipynb` (literature-grounded generator: Damerau 1964, Kukich 1992, Belinkov & Bisk 2018, Ziv et al. 2022). Retrain there, then copy the new `categorizer_stage2.joblib` into `billpay_backend/ml/`. The model was trained with scikit-learn 1.8.0, which `requirements.txt` now pins (`scikit-learn==1.8.0`); the saved file must be loaded with the same version.

**Verified:** `POST /categorize/` with "Singtl" → Telecoms, confidence 0.85, method `ml` (Stage 1 found no match, so the model answered). Server run with Python 3.14 + scikit-learn 1.8.0.

### 8a. BILLER_REGISTRY is a dictionary, not a table

It is a plain Python dictionary at the top of `categorizer.py` (name → category, 45 lines). Stage 1 reads it directly; it never touches the database.

The database `billers` table is a **separate copy**, made by `seed_billers.py`:
1. For each name in the dictionary it builds a code (`SP Power` → `SP_POWER`; 19 older codes are fixed in `LEGACY_CODES` so old transactions and icons don't break).
2. It picks an icon and colour (per-biller overrides, else a default per category).
3. It looks the code up in the table: **missing → added; present but changed → updated; present and same → untouched.** So it is safe to re-run (no duplicates). Rows no longer in the dictionary are **left in place** and listed for manual review (deleting them would orphan old transactions).

Why two copies: the database rows need extra things the dictionary doesn't have (id, code, icon, colour) and are what the app lists and what linked billers / transactions point at; the categorizer must work without a database (fast, usable in tests and notebooks). The cost is that the copies can drift until the seed is re-run — which is why the table has 20 rows but the dictionary has 45.

Running it is **manual** (the server never runs it): from inside `billpay_backend/`, `python seed_billers.py`. It prints how many were added / updated and the total, then any stale rows. Expected on the current DB (not run yet): about 26 added, `NTU Tuition` renamed to `NTU Fees`, `OCBC Credit Card` listed as stale, total about 46.

### 8b. Training data today: why "135 rows, no typos" is the weak point

`build_training_data()` makes 3 rows per biller: the name as written, lowercase, and the first word only. For `SP Power`: `SP Power`, `sp power`, `SP`. 45 billers × 3 = about 135 rows. One-word names (e.g. `Singtel`) produce the same text twice, so some rows are exact duplicates.

Every row is a correct spelling, so the model has never seen a misspelling, an abbreviation or a legal suffix. A real-world input like `Singtl` or `SP GRP Pte Ltd` is unlike anything it trained on. The September literature-grounded generator (Item 1) replaces these 3 copies with many realistic messy variants per biller.

### 8c. What "ensemble" means (and why it doesn't apply here)

An ensemble combines the answers of several predictors into one, e.g. three models vote, or their confidences are averaged. The file header says "Ensemble output: confidence-weighted combination", but the code doesn't do that. `categorize()` is a **cascade**: if Stage 1 matches (confidence ≥ 0.85) it answers and the ML never runs; only otherwise does the ML answer. Call it "hybrid two-stage" in the report.

### 8c-2. One registry for both stages — `ml/biller_registry.json`

**Done 22 Oct 2026.** The biller list used to exist twice (a dictionary in `categorizer.py` and a copy in the notebook), which could drift. It now lives in one file, `billpay_backend/ml/biller_registry.json` (biller name → category, 45 entries), read by:

| Who | How it uses it |
|---|---|
| Stage 1 rules (`categorizer.py`) | loads the JSON into `BILLER_REGISTRY` at startup |
| `seed_billers.py` | still imports `BILLER_REGISTRY` from `categorizer.py`, so the app's biller list comes from the same file |
| Stage 2 training (notebook) | cell "1. Biller registry" loads the JSON and generates the variants from it |

`BILLER_REGISTRY` keeps its name in `categorizer.py`, so nothing else in the backend changed.

**To add or change a biller:**
1. Edit `biller_registry.json` only (use one of the 8 existing category names).
2. Run `python seed_billers.py` (app biller list).
3. Retrain in the notebook if you want the ML stage to handle typos of the new biller: Colab asks you to upload the JSON; run locally it finds `../billpay_backend/ml/biller_registry.json` by itself. Then copy the new `categorizer_stage2.joblib` into `ml/` and restart the server.
4. Restart the server (Stage 1 reads the JSON at startup).

**Caveat:** the saved model only knows billers that were in the JSON when it was trained. If the JSON and the joblib are out of step, rules know the new biller but the ML doesn't. Commit the JSON and joblib together.

### 8d. Open items — ML categorizer

- [ ] ML-1. Header docstring claims an ensemble / confidence-weighted combination; the code is a rule-first cascade. Fix the docstring, or describe it as two-stage in the report
- [ ] ML-2. Loose "contains" rule (`key in input or input in key`): an empty string matches everything; very short inputs can match by accident. Test `categorize("")` and add a minimum length or whole-word matching
- [ ] ML-3. Unused `MultinomialNB` import: remove, or use it as a comparison model (Naive Bayes vs Logistic Regression) for the report
- [x] ML-4. Training data had no typos: replaced by the notebook's literature-grounded data (315 rows) — done
- [ ] ML-5. Test split is tiny (about 27 rows) and near-duplicates of a biller can land in both train and test, so accuracy is optimistic: add grouped (unseen-biller) evaluation (A5)
- [x] ML-6. `MODEL_PATH` is now absolute (based on the file's location) and a missing model raises `FileNotFoundError` instead of training — done
- [ ] ML-16. Optional: in `load_model()`, compare the installed scikit-learn version with the one that trained the model and give a clear error on mismatch (instead of a `NotFittedError` at request time)
- [ ] ML-7. Below 0.5 confidence the method is `ml_low_confidence` but a category is still returned and saved: decide whether to show "Unknown / needs review" instead
- [x] ML-8. Ran `python -m ml.categorizer`: "Unknown Merchant XYZ" → Finance, 36%, `ml_low_confidence` (confirms ML-7 is a real issue)
- [ ] ML-9. Add unit tests for `categorize()` (exact, case-insensitive, partial, typo, unknown, empty)
- [ ] ML-10. Re-run `seed_billers.py` after the registry changes (A10)
- [ ] ML-11. Notebook cross-validation fits the TF-IDF vectorizer on **all** rows before splitting, so held-out folds leak into the vocabulary. Pass the full Pipeline (TF-IDF + classifier) to cross-validation instead
- [ ] ML-12. In the notebook, the uppercase "case variant" rows become identical to the original after the vectorizer lowercases them, so they add duplicates, not new information. Consider dropping or replacing that variant
- [ ] ML-13. `single_edit_error()` can return the input unchanged (names under 4 characters, or substituting a space or non-letter), and a deletion can remove a space. Filter out unchanged results when building the dataset
- [ ] ML-14. `statement_format()` cuts the name to 14 characters, which can truncate long names mid-word. Check whether that is realistic for statement text
- [ ] ML-15. Split by `source_biller` (all variants of one biller together) to measure accuracy on billers the model has never seen (same as A5)

My notes:
-

---

## 9. Plaid — `plaid_router.py`, `plaid_service.py`

Status: 📖

Flow: create link token → user connects bank → exchange public token for access token → fetch transactions → run each through the categorizer → compare with Plaid's own category labels (`ml_accuracy`).

- `get_sandbox_access_token()` connects Plaid's test bank without a real login.
- Access tokens are held in an in-memory dict (`PLAID_TOKENS`) and lost when the server restarts.
- `map_plaid_category()` maps Plaid's categories onto the app's 8 categories.

My notes:
-

---

## 10. Auth — `routers/auth.py`

Status: ❓

Register, login (bcrypt hashing), Google login, OTP password reset, profile update, change password. Status is now 📖 for the routes (read this session).

- Register refuses a duplicate email; login returns a 401 on a wrong email or password and a 403 if `is_active` is false.
- Google login does **not** verify the token with Google yet: it trusts the email and name the app sends. Known gap.
- OTP reset: the code is stored in memory (`OTP_STORE`), expires after a few minutes, and is sent by email via `email_service.py`. If SMTP isn't configured it is **printed to the server console** and is **no longer returned in the API response**.
- Change password requires the current password, at least 8 characters, and a password different from the old one.

My notes:
-

---

## 11. Other files

| File / folder | What it is | Status |
|---|---|---|
| `bills.py`, `insights.py` | Routers not yet read | ❓ |
| `email_service.py` | Sends OTP email (to confirm) | ❓ |
| `seed_billers.py`, `seed_demo_user.py` | Fill the database with demo data | ❓ |
| `plaid_integration/` | Older duplicate of Plaid code — confirm unused | ❓ |
| `bak/` | Backup of old screens — not opened | ❓ |
| `setup*.ps1`, `fix_icons.ps1` | Scripts that originally generated the project | ❓ |
| `BillPay_Stage2_Training.ipynb`, `biller_training_data_v2.csv`, `categorizer_stage2.joblib` | Sept ML experiment (not wired into the app) | 📖 |

---

## Questions to ask next

-

---

## 12. Open items (master list)

Last updated: 22 Oct 2026. Tick items off as they are done.

### A. ML categorizer — commitment made to Dr Gu (Item 1)

Dr Gu replied "Sounds solid to me" to the literature-grounded synthesis plan. **The app now uses the notebook-trained model** (A1–A4, A7 done and tested). Training happens only in the notebook; the app only loads `categorizer_stage2.joblib`.

- [x] A1. Backed up `ml/` to `C:\Users\User\ml_backup`
- [x] A2. Generator built inside the notebook (`notebooks/BillPay_Stage2_Training.ipynb`) instead of a separate `generate_dataset.py` (Damerau/Kukich, Belinkov & Bisk, Ziv et al.)
- [x] A3. `categorizer.py` rewritten as load-only (absolute `MODEL_PATH`, no training code); `/categorize/evaluate` and `/retrain` removed; `requirements.txt` pins `scikit-learn==1.8.0`
- [x] A4. Model retrained in Colab with scikit-learn 1.8.0 (matching the laptop), copied to `ml/`, load test and `POST /categorize/` test passed (Singtl → Telecoms). Note: use `python -m uvicorn` / `python -m pip` (see section 0)
- [ ] A5. Create `ml/evaluate_stage2.py` and run it: report **both** the known-biller accuracy and the unseen-biller (grouped) accuracy. The notebook's 98.4% / 98.7% are optimistic (variants of the same 45 names appear in train and test)
- [ ] A6. Run the Plaid sandbox benchmark (`/plaid/sandbox/connect/1`, then `/plaid/transactions/1`) and record `ml_accuracy`
- [x] A7. Old `categorizer.pkl` deleted; old `ml/` is backed up. (Old uploaded `generate_dataset.py` is not part of the app)
- [ ] A8. Cross-check the biller registry against the real DBS GIRO / HSBC / UOB lists (promised in the 4 Sep email; the current 45 were copied from existing code and are not verified)
- [ ] A9. Grow the registry (plan target: 45 → 55 → 80–100)
- [ ] A10. Re-seed the `billers` table (DB has 20 rows, registry has 45): run `python seed_billers.py` from inside `billpay_backend/`. Checked: it is safe to re-run (matches by `biller_code`, no duplicates); `OCBC Credit Card` will be listed as stale and left in place
- [ ] A11. Commit the generator, evaluation script and CSV; log the result in `PROGRESS.md`
- [ ] A12. Remaining categorizer clean-ups (section 8d): ML-1 docstring "Ensemble" claim, ML-2 loose "contains" rule, ML-7 low-confidence behaviour, ML-9 unit tests, ML-16 version guard (ML-3, ML-4, ML-6, ML-8 done)

### B. Git and GitHub

State: one commit ("Initial commit"), branch `master`, no remote. `.gitignore` is edited (`.env` now ignored, verified) but **not committed**.

- [ ] B1. Delete the stale `.git\index.lock` (0 bytes, dated 13 Sep, no git process running)
- [ ] B2. Set `git config user.name` / `user.email` if git asks who you are
- [ ] B3. Commit `.gitignore`
- [ ] B4. Dry run `git add -n ...`; confirm no `.env`, `billpay.db` or `__pycache__`; then commit app + backend + notes
- [ ] B5. Decide what to do with `bak/`, `plaid_integration/`, the `setup*.ps1` / `fix_icons.ps1` scripts, `fix_ppt.py` (leftovers: keep, move out, or delete)
- [ ] B6. Create a **private** empty GitHub repo (account `anshikaaaa17`); `git remote add origin`, `git branch -M main`, `git push -u origin main`
- [ ] B7. Open the repo in the browser and confirm `.env` is not visible
- [ ] B8. Ask Dr Gu how she wants the code submitted (repo link, zip, or neither)
- [ ] B9. Refresh the Google Drive backup zip after the ML commit (working copy stays local; Drive is backup only)

### C. Code fixes

- [ ] C1. `src/services/api.js`: hardcoded laptop IP (`BASE_URL`) → env var or config
- [ ] C2. Tests: none exist in `billpay_backend/` or `src/` (Section 7 of the submitted plan promises a testing strategy). Minimum: categorizer unit tests + a few API tests
- [ ] C3. `LinkBankScreen.js` is not imported in `App.js` (Plaid connect screen unreachable). Wire it only if Plaid is in the demo; also confirm which copy is current (`src/screens/` vs `plaid_integration/`)
- [ ] C4. Google login does not verify the token server-side (optional: fix, or state as a known limitation)
- [ ] C5. `ml_labels` table is never written (optional: save labels for evaluation, or stop describing it as in use)
- [ ] C6. Real-bank Plaid flow (Link UI in the app) not confirmed end to end; only sandbox tested
- [ ] C7. `App.js`: unused `mode` variable in `RootNavigator`; status bar is always `"light"` regardless of theme

### D. Limitations to state honestly in the report (no fix needed)

- OTP codes (`OTP_STORE`) and Plaid access tokens (`PLAID_TOKENS`) are in memory; lost on server restart
- No delete / deactivate route for user accounts (future work)
- Unlinking a biller is a soft delete (`is_active = False`); payments and top-ups can't be edited or deleted
- Payment gateway and biller API are mocks (random delay, 5% failure)
- Synthetic training data comes from only 45 names; unseen-biller accuracy is the honest number

### E. Documents

- [ ] E1. Upload `Project_Plan_CCDS26-0127_v6.docx` to the OneDrive folder Dr Gu comments on (the 18 Sep email promised the plan would be updated). Check first that your own Word edits are still in it
- [ ] E2. Optional: add one line to Dr Gu about reviewing merchant / transaction categorization literature (García-Méndez 2024, Ta et al. 2025, Aluffi et al. 2025 — already in v6 section 10.7)
- [ ] E3. Update `PROGRESS.md` (last updated 13 Sep; missing the literature review, Dr Gu's reply, v6)
- [ ] E5. Upcoming official dates: Interim Report 25 Jan 2027; Final Report 22 Mar 2027; Amended Final 16 Apr 2027; Oral 7, 10–12 May 2027

### F. Understanding the code (this file)

- [ ] F1. Walk through: screens, AuthContext, services/api.js, `bills.py`, `insights.py`, seed scripts, `email_service.py`
- [ ] F2. Confirm what `src/services/database.js` stores on the phone
- [ ] F3. Fill in "My notes" under each section as you go

---

## 13. The training notebook — `BillPay_Stage2_Training.ipynb`

Status: 📖

**What it does:** trains BillPay's Stage 2 model, which predicts a bill's category from the biller's name even when the name has a typo or abbreviation. Unlike `App.js` (which controls screens), this notebook builds a model for the backend.

| Biller entered | Intended category |
|---|---|
| Singtel | Telecoms |
| Netlfix | Entertainment |
| SP Power Pte Ltd | Utilities |
| NTU Fees | Education |

**Outputs (3 files):**

| File | Purpose |
|---|---|
| `biller_training_data.csv` | The generated training examples |
| `confusion_matrix.png` | The evaluation chart |
| `categorizer_stage2.joblib` | The trained model pipeline |

### 13.1 Imports and random seeds
The first code cell imports: `random` / `numpy` (repeatable random variations), `pandas` (the data table), `TfidfVectorizer` (turns names into numbers), `LogisticRegression` (learns the categories), scikit-learn evaluation tools, `matplotlib` / `seaborn` (the confusion matrix chart) and `joblib` (saves the model). `random.seed(42)` and `np.random.seed(42)` make the random steps repeatable when run in the same order; 42 is just a chosen number.

### 13.2 The biller registry
`BILLER_REGISTRY` is a dictionary of 45 known billers and their correct category across 8 categories (Utilities, Telecoms, Finance, Insurance, Housing, Entertainment, Education, Transport). `"Singtel": "Telecoms"` means Singtel belongs to Telecoms. These are the answers the model learns. This is a **copy** of the dictionary in `categorizer.py`, so it can drift from it if you add billers later.

### 13.3 Generating messy versions of each name
Users type names differently from the registry, so the notebook creates artificial variations. Each function follows a paper from the Dr Gu literature review.

| Function | What it does | Example | Source |
|---|---|---|---|
| `qwerty_neighbor(ch)` | Picks a key physically next to a letter, keeping upper / lower case (`QWERTY_NEIGHBORS` lists the neighbours, e.g. `s` → `awedxz`) | s → d | Belinkov & Bisk 2018 |
| `single_edit_error(name)` | One random edit: **substitution** (replace a letter), **deletion** (remove one), **insertion** (add a neighbouring-key letter), **transposition** (swap two neighbours) | Singtel → Skngtel / Sigtel / Sinngtel / Singetl | Damerau 1964; Kukich 1992 |
| `abbreviate(name)` | Multi-word: randomly the **first word**, the **initials**, or a **prefix cut** (all but the last 2 characters, minimum 3, upper case). One word: cut the last 2 characters | SP Power → SP / SP / SP POW; Singtel → SINGT | Company-name matching research (Ziv et al. 2022) |
| `legal_suffix(name)` | Adds one of ` Pte Ltd`, ` Ltd`, ` Limited`, ` Group` | Singtel Pte Ltd | Ziv et al. 2022 |
| `statement_format(name)` | Upper case, spaces → hyphens, first 14 characters, then `-SG` | SP Power → SP-POWER-SG | Imitates a shortened bank statement line |

Details worth knowing:
- `single_edit_error` picks a position from the 2nd character to the 2nd-last, so the first and last character are never the *start* of a substitution / deletion / insertion; a transposition at the 2nd-last position still swaps with the last character.
- It can return the name **unchanged** (names under 4 characters, or when the chosen character has no keyboard neighbour such as a space), and a deletion can remove a space.
- The legal suffixes are synthetic strings, not the companies' real legal names.

### 13.4 Building the training dataset
For each of the 45 billers it makes 7 rows:

| # | Row | `variant_type` |
|---|---|---|
| 1 | Original name | original (registry) |
| 2 | UPPER CASE | case variant |
| 3 | With legal suffix | legal-suffix |
| 4 | Abbreviation | abbreviation |
| 5 | Statement format | statement-format |
| 6 | First random typo | typo-1 |
| 7 | Second random typo | typo-2 |

So **45 × 7 = 315 rows**, shuffled into a pandas table with columns `biller_name`, `category`, `source_biller`, `variant_type`. Only `biller_name` and `category` are used for training; the other two columns trace where each row came from. The table is saved as `biller_training_data.csv`. These are 315 variations of 45 names, **not** 315 independently collected real bills.

### 13.5 Splitting into training and test sets
`train_test_split(..., test_size=0.2, stratify=labels, random_state=42)`: 80% (252 rows) to learn from, 20% (63 rows) held back for testing. `stratify` keeps the category mix similar in both parts.

### 13.6 Turning names into numbers (TF-IDF)
`TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4))` represents each name by its short character sequences (2, 3 and 4 letters, inside word boundaries). `Singtel` contains `si, in, ng`, `sin, ing, ngt`, `sing, ingt`. A misspelled name still shares many sequences with the correct one, which is why this helps with typos. TF-IDF gives extra weight to sequences that are distinctive across the training names. It produces a numerical representation; it does not understand what a company is.

`fit_transform` on the training names learns the vocabulary and weights and converts them; `transform` on the test names reuses what was already learned. This held-out test correctly learns the vectorizer from training data only.

### 13.7 Training Logistic Regression
`LogisticRegression(max_iter=1000, C=5.0, random_state=42)` is used here for classification. It learns which character patterns point to which category (patterns from Singtel, StarHub and M1 → Telecoms). `max_iter=1000` allows up to 1,000 optimisation steps; `C=5.0` sets regularisation strength (larger = weaker). `clf.fit(...)` trains it and `clf.predict(...)` predicts the test names.

### 13.8 Held-out results
Accuracy **0.984** = 62 of 63 test rows correct. One Insurance row was predicted as Entertainment. The report shows precision (of the names predicted as a category, how many were right), recall (of the names truly in a category, how many were found), F1 (the two combined) and support (rows per category). This is strong on this synthetic test set; it does **not** show 98.4% on real user input.

### 13.9 5-fold cross-validation
`StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` splits the data into five parts and trains / tests five times, each time holding out a different part. Every row gets a prediction from a model that did not train on it. Result: CV accuracy **0.987** = 311 of 315 correct.

**Two evaluation limitations (see ML-11, ML-12, ML-15):**
1. The vectorizer is fitted on all names before cross-validation (`vectorizer_full.fit_transform(names)`), so held-out folds leak into its vocabulary and weights. The fix is to give cross-validation the whole Pipeline.
2. Variants of the same biller land in both training and test (e.g. `Singtel` in training, `SINGTEL-SG` in testing; and the upper-case variant becomes identical to the original once the vectorizer lowercases it). The evaluation therefore mostly measures recognition of variations of **known** billers. To measure new billers, split by `source_biller`.

### 13.10 Confusion matrix
`confusion_matrix(labels, cv_pred, labels=cats)` draws rows = actual category, columns = predicted category. Numbers on the diagonal are correct predictions; numbers elsewhere show which categories were confused. `plt.savefig("confusion_matrix.png", dpi=150)` saves the chart.

### 13.11 Training and saving the final model
A `Pipeline` joins the two steps: biller name → TF-IDF features → category. `final_pipeline.fit(names, labels)` trains it on **all 315 rows** (after evaluation). `joblib.dump(final_pipeline, "categorizer_stage2.joblib")` saves the vectorizer and classifier together, so the backend can call `model.predict(["Netlfix"])` without converting the name to numbers itself.

### 13.12 Sample predictions and confidence

| Input | Prediction | Confidence |
|---|---|---|
| SP Power Pte Ltd | Utilities | 89% |
| Netlfix | Entertainment | 60% |
| SINGTEL-SG | Telecoms | 83% |
| Unknown Merchant XYZ | Finance | 36% |

`predict_proba(...).max()` is the highest predicted class probability. An unknown name still gets one of the 8 categories: the classifier has no "Unknown" class or rejection rule, which is why the app may need a confidence threshold and user confirmation (ML-7). A reported probability is not a guarantee. These checks come from a model trained on all the data, so they are sanity checks, not an independent test.

### 13.13 Connecting it to BillPay
**Status: connected and tested (22 Oct 2026).** The notebook still does not touch the app by itself; the hand-off is a file. The workflow:
1. Train in the notebook (Colab: first cell `!pip install -q scikit-learn==1.8.0`, then Runtime > Restart session, Run all) so the library matches `requirements.txt`.
2. Download `categorizer_stage2.joblib` and copy it into `billpay_backend/ml/`.
3. Restart the server with `python -m uvicorn main:app --reload --port 8000`.

`categorizer.py` only loads the file; a missing file raises an error rather than training. The notebook, its CSV and the confusion matrix live in `notebooks/`. If the server throws `NotFittedError` or `InconsistentVersionWarning`, the Python or scikit-learn version running the server differs from the one that trained the model.

**One-line summary for the report:** "This notebook trains BillPay's Stage 2 bill categorisation model. It generates spelling and formatting variations of known biller names, converts them into character-based TF-IDF features, and trains Logistic Regression to predict eight bill categories. It evaluates the predictions and exports the trained pipeline for backend integration. The current results measure synthetic variations of known billers; real user data and stricter validation are needed to assess broader performance."
