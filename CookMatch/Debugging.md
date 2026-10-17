# CookMatch: Debugging Guide

A practical guide for finding and fixing problems in CookMatch. It covers a general debugging method, where to look for each kind of problem, the most likely bugs in the matching engine, and common errors with their fixes.

> Commands and log settings assume the proposed stack (React, Node.js with Express, PostgreSQL). Adjust them if the team uses different tools.

---

## 1. Debugging Method

Follow the same steps for every bug. Do not change code until step 3 is done.

1. **Reproduce.** Find the exact steps that trigger the bug. If it cannot be repeated, it cannot be fixed with confidence.
2. **Isolate.** Decide which layer fails: UI, API, matching engine, or database.
3. **Find the cause.** Read the error, check the logs, and test the smallest piece of code that shows the problem.
4. **Fix.** Change one thing at a time.
5. **Verify.** Repeat the original steps, then run the automated tests.
6. **Prevent.** Add a test that fails without the fix, so the bug cannot return.

### 1.1 Which layer is failing?

| Symptom | Likely layer | First check |
| --- | --- | --- |
| Page is blank or buttons do nothing | Frontend | Browser console errors |
| Request shows red in the network tab | API or network | Status code and response body |
| Status 4xx | Request or authentication | Request body, token, error `code` |
| Status 500 | Backend code or database | Server log and stack trace |
| Data looks wrong but no error | Matching engine or data | Run the SQL query by hand |
| Works locally, fails on the server | Environment | `.env` values, database version, HTTPS |
| Works for one user, fails for another | Data or permissions | Compare their pantry and role |

---

## 2. Tools and Setup

| Tool | Use |
| --- | --- |
| Browser DevTools (Console, Network) | Frontend errors, API calls, response bodies |
| React Developer Tools | Component state and props |
| Node.js inspector (`node --inspect`) with VS Code debugger | Breakpoints in backend code |
| `psql` | Run and time SQL queries directly |
| `EXPLAIN ANALYZE` | See why a query is slow |
| Postman or curl | Call the API without the UI |
| Server logs | Trace a request from start to end |

### 2.1 Turn on debug mode

Run the server with the inspector and verbose logs:

```bash
LOG_LEVEL=debug node --inspect src/index.js
```

In VS Code, add a launch configuration to attach to the running process, then set breakpoints in `matcher.js`, `normalizer.js` or the route handlers.

### 2.2 Call the API without the UI

```bash
# Log in and copy the token
curl -X POST http://localhost:5000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"saske@example.com","password":"StrongPass123"}'

# Call a protected endpoint
curl http://localhost:5000/v1/recommendations?maxTime=30 \
  -H "Authorization: Bearer <token>"
```

If the API works with curl but fails in the UI, the bug is in the frontend.

---

## 3. Logging

Good logs make most bugs easy to find. Log events, not secrets.

### 3.1 Log levels

| Level | Use for |
| --- | --- |
| `error` | Failures that need attention (unhandled errors, database down) |
| `warn` | Problems the app handled (bad login, unknown ingredient) |
| `info` | Normal events (server started, user registered) |
| `debug` | Detail for developers (match scores per recipe, query timings) |

### 3.2 What to log on every request

- A request ID, so one request can be followed through every layer.
- Method, path, status code and duration.
- The user ID (never the email or password).

```
2026-10-17T16:42:10Z info  req=a91f user=12 GET /v1/recommendations 200 184ms
2026-10-17T16:42:44Z warn  req=b27c user=12 PUT /v1/pantry 422 UNKNOWN_INGREDIENT "tomatoe"
2026-10-17T16:43:02Z error req=c3d0 user=12 GET /v1/recipes/15 500 "relation recipe_steps does not exist"
```

### 3.3 What never to log

- Passwords, password hashes, tokens, the `JWT_SECRET`, or the full `DATABASE_URL`.
- Full request bodies for `/auth` endpoints.

---

## 4. Debugging the Matching Engine

The matching and ranking engine is the core of CookMatch, so it deserves its own checklist.

### 4.1 Check the score by hand

Pick one recipe and one user. Count the recipe's required ingredients and the ones the user has. Then compare with the API result.

```
Match score = (ingredients the user has / ingredients the recipe requires) x 100
```

Example: a recipe needs 5 ingredients, the user has 3, so the score is 60.

### 4.2 Run the matching query directly

Run the core query from the architecture file in `psql` with a real user ID. If the SQL result is right and the API result is wrong, the bug is in the Node code. If both are wrong, the bug is in the SQL or the data.

```sql
SELECT
    r.recipe_id, r.title,
    COUNT(*) AS required_count,
    COUNT(pi.ingredient_id) AS have_count,
    ROUND(100.0 * COUNT(pi.ingredient_id) / COUNT(*), 1) AS match_score
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
LEFT JOIN pantry_items pi
       ON pi.ingredient_id = ri.ingredient_id AND pi.user_id = 12
GROUP BY r.recipe_id, r.title
ORDER BY match_score DESC;
```

### 4.3 Common matching bugs

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Score is always 0 or 100 | Integer division | Multiply by `100.0`, or cast to float, before dividing |
| Score above 100 | Duplicate rows in the join (for example duplicate `recipe_ingredients`) | Check primary keys and clean duplicate data |
| Recipe with no matching ingredient appears | Missing `HAVING COUNT(pi.ingredient_id) > 0` | Add the condition |
| Ingredient typed by alias not counted | Pantry stored the raw text, not the ingredient ID | Normalize names to IDs before saving |
| Same recipe listed twice | Join with `recipe_dietary_tags` without `GROUP BY` or `DISTINCT` | Group by recipe or use `EXISTS` for tag filters |
| Ranking changes between requests | No tie-break in `ORDER BY` | Sort by score, then expiring count, then cooking time, then recipe ID |
| Expiry boost never applies | Expiry window compared with the wrong date type or time zone | Compare `DATE` values and use `CURRENT_DATE` |
| `almostAchievable` wrong | Off-by-one on the missing count | Flag when missing is 1 or 2 only (not 0, not 3 or more) |
| Substitute missing | `LEFT JOIN` turned into an inner join by a `WHERE` condition | Move the condition into the `ON` clause |
| Filters ignored | Query parameters arrive as strings | Convert `maxTime` to a number and validate before use |

### 4.4 Quick log for the ranking step

Add a temporary debug log, and remove it when done:

```javascript
logger.debug('rank', recipes.map(r => ({
  id: r.recipeId, score: r.matchScore, expiring: r.expiringCount, time: r.cookingTimeMin
})));
```

---

## 5. Debugging the API

### 5.1 Status code guide

| Status | First thing to check |
| --- | --- |
| 400 | Request body against the validation rules in `api.md`; wrong types or missing fields |
| 401 | Token missing, expired, or the `Authorization` header is not `Bearer <token>` |
| 403 | The user's role; the endpoint may need `admin` |
| 404 | Wrong ID, wrong path, or the resource belongs to another user |
| 409 | Duplicate email, ingredient, alias or pantry item |
| 422 | Ingredient name matches no ingredient or alias |
| 500 | Server log for the stack trace; usually a code or database error |

### 5.2 Common API problems

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `req.body` is `undefined` | JSON parser middleware missing or placed after the routes | Add `app.use(express.json())` before the routes |
| CORS error in the browser | Frontend origin not allowed | Configure CORS for the frontend URL |
| Always 401 even with a token | Header typo, secret mismatch, or token expired | Print the decoded token (never in production logs); check `JWT_SECRET` is the same everywhere |
| Route returns 404 for a valid path | Route order or wrong base path (`/v1`) | Check route mounting and the prefix |
| Request hangs with no response | An `await` without error handling, or a missing `res.send` | Wrap handlers in try/catch or an async error wrapper; make sure every branch responds |
| Unhandled promise rejection crashes the server | Async error not caught | Use a central error handler |
| Error response is HTML, not JSON | Default Express error page | Add an error-handling middleware that returns the standard error format |

---

## 6. Debugging the Database

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `relation "x" does not exist` | Schema not created, or connected to the wrong database | Run `schema.sql`; check `DATABASE_URL` |
| `duplicate key value violates unique constraint` | Inserting an existing email, alias or pantry item | Return `409 DUPLICATE`; check before insert |
| `violates foreign key constraint` | Referencing an ID that does not exist | Validate IDs first and return `404` |
| `invalid input syntax for type integer` | A string reached an integer column | Validate and convert input in the API |
| `connect ECONNREFUSED` | PostgreSQL not running or wrong port | Start PostgreSQL; check host and port |
| `password authentication failed` | Wrong credentials in `DATABASE_URL` | Fix the connection string |
| Slow recommendation query | Missing index or too many recipes scanned | Run `EXPLAIN ANALYZE`; add the indexes from the design file |
| Pantry changes not visible | Transaction not committed, or caching | Check commit; check for stale client state |
| Test data keeps changing | Tests share one database state | Reset and re-seed the test database before each run |

### 6.1 Find a slow query

```sql
EXPLAIN ANALYZE
SELECT ... -- paste the matching query here
```

Look for `Seq Scan` on large tables and for a long execution time. The `recipe_ingredients (ingredient_id)` and `pantry_items (user_id)` indexes are the most important for this app.

---

## 7. Debugging the Frontend

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Blank screen | A JavaScript error stopped rendering | Read the console; add an error boundary |
| List does not update after adding an ingredient | State not updated, or old data re-used | Update state after the API call succeeds; re-fetch recommendations |
| Suggestions fire on every keystroke and the UI lags | No debounce on search | Debounce typing by about 250 ms |
| Old results flash after typing fast | Responses arrive out of order | Cancel the previous request or ignore stale responses |
| User logged out unexpectedly | Token expired | Handle `401` by redirecting to login with a clear message |
| Filters do not apply | Filter values not sent as query parameters | Check the request URL in the network tab |
| Images broken | Wrong or missing `imageUrl` | Show a placeholder image when the URL fails |
| Layout breaks on mobile | Fixed widths | Test at 375 px; use flexible layouts |
| Works in Chrome, breaks in Safari | Unsupported CSS or JS feature | Check browser support; add a fallback |
| Clay shadows look flat or muddy | Shadow values too low or background color too close to card color | Increase contrast between the card and the cream background |

---

## 8. Debugging Authentication Problems

See `Authentication_and_Security.md` for the design. Quick checks:

| Problem | Check |
| --- | --- |
| Cannot log in with the right password | Password was hashed with a different method or salt rounds when registered; check the hash comparison call |
| Token rejected right after login | Server clock, `JWT_SECRET` differs between instances, or `expiresIn` is too short |
| Normal user can reach admin endpoints | Role check middleware missing or placed after the handler |
| User sees another user's data | Query uses a user ID from the request body instead of from the token |
| Login works locally but not in production | HTTPS, cookie or CORS settings differ |

---

## 9. Reading a Stack Trace

```
TypeError: Cannot read properties of undefined (reading 'ingredientId')
    at normalizeIngredient (server/src/services/normalizer.js:24:31)
    at PUT /pantry (server/src/routes/pantry.js:18:20)
```

1. Read the first line: what went wrong (`undefined` was read).
2. Find the first line that points to your own code (`normalizer.js:24`), not a library.
3. Open that line and work out which value was `undefined`, and why it was never set.
4. Follow the calls below it to see where the bad value came from (`pantry.js:18`).

---

## 10. Common Error Messages

| Message | Meaning | Where to look |
| --- | --- | --- |
| `UNKNOWN_INGREDIENT` (422) | Typed name matches nothing | Ingredient and alias tables; spelling |
| `TOKEN_INVALID` (401) | Token missing, expired or tampered | `Authorization` header; token lifetime |
| `VALIDATION_ERROR` (400) | Request failed a rule | `details` array in the response |
| `DUPLICATE` (409) | Value already exists | Unique constraints |
| `FORBIDDEN` (403) | Role not allowed | Role check middleware |
| `ECONNREFUSED` | Cannot reach a service | Is the database or API running? |
| `ERR_MODULE_NOT_FOUND` | Missing import or package | `npm install`; check the import path |
| `EADDRINUSE` | Port already used | Stop the other process or change `PORT` |

---

## 11. Debugging Checklist

Before asking for help, confirm:

- [ ] I can reproduce the bug with exact steps.
- [ ] I know which layer fails (UI, API, engine, database).
- [ ] I read the full error message and stack trace.
- [ ] I checked the browser console and the server log.
- [ ] I tested the API alone with curl or Postman.
- [ ] I ran the SQL by hand with the same data.
- [ ] I checked `.env` values and that services are running.
- [ ] I tried the same steps with the seed data and a clean database.
- [ ] I changed one thing at a time.
- [ ] I added a test for the fix.

---

## 12. Bug Report Template

```
ID:               BUG-000
Title:            Short, clear summary
Severity:         Critical / High / Medium / Low
Layer:            UI / API / Engine / Database
Environment:      Browser, device, local or staging
Steps to reproduce:
  1.
  2.
  3.
Expected result:
Actual result:
Request ID / logs:
Screenshot or response body:
Suspected cause:
Fix applied:
Test added:       Yes / No (test ID)
```

---

## 13. Best Practices

- Reproduce first, fix second.
- Change one thing at a time and re-test.
- Use the fixed seed dataset to get repeatable results.
- Keep error responses in the standard format, and log the full detail only on the server.
- Never leave debug logs, breakpoints or test accounts in a release.
- Write a regression test for every bug that was hard to find.
- Write down what the cause was; the same mistake often appears twice.
