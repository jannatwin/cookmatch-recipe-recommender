# CookMatch: Testing and QA Plan

Testing and quality assurance plan for CookMatch, a recipe recommendation system based on available ingredients.
Every test case traces back to a requirement in the Software Requirements Specification (FR-1 to FR-21, NFR-1 to NFR-11) and to an endpoint in `api.md`.

> Tools, thresholds and schedules below are proposed defaults. Adjust them to the team's final setup.

---

## 1. Purpose and Scope

**Purpose:** confirm that CookMatch does what the requirements say, that the matching and ranking results are correct, and that the system is secure, usable and stable enough to demonstrate.

**In scope**

- Account management, ingredient input, pantry, matching and ranking, substitutes, filters, recipe details, admin functions.
- REST API, database queries, web UI.
- Non-functional checks: performance, usability, security, compatibility, maintainability.

**Out of scope** (matches the project limitations)

- Quantity-based matching.
- Image-based ingredient recognition.
- Nutritional accuracy verification.

---

## 2. Test Strategy

| Level | What it checks | Who | Proposed tools |
| --- | --- | --- | --- |
| Unit | Single functions: normalizer, match score, ranking, substitute lookup, validators | Developers | Jest |
| Integration | API endpoints with the real database; module-to-module calls | Developers | Supertest, test PostgreSQL database |
| System (end to end) | Full user flows in the browser | QA / team | Cypress or Playwright |
| Acceptance | Requirements met from the user's point of view | Whole team, instructor demo | Manual checklist |
| Performance | Response time and concurrent users | QA | k6 or Apache JMeter |
| Security | Authentication, authorization, injection, password storage | QA | Manual checks, OWASP ZAP |
| Usability | Ease of use on desktop and mobile | QA with 3 to 5 test users | Observation sheet |
| Compatibility | Supported browsers and screen sizes | QA | Manual, browser dev tools |
| Regression | Old features still work after changes | Automated suite on each change | CI pipeline |

**Approach**

- Write unit tests for the matching logic first, since it is the core of the product.
- Run unit and integration tests automatically on every commit.
- Run the end-to-end suite before each demo or release.
- Test with a fixed seed dataset so results are repeatable.

---

## 3. Test Environment

| Item | Setup |
| --- | --- |
| Test database | Separate PostgreSQL database, reset and re-seeded before each integration run |
| Backend | Node.js server in test mode |
| Frontend | Latest Chrome, Firefox, Edge, Safari; mobile widths of 375 px and 768 px |
| Accounts | One normal user, one admin, one empty-pantry user |
| Network | HTTPS for staging; local HTTP allowed only during development |

---

## 4. Test Data

Use this fixed dataset so expected results can be calculated by hand.

**Ingredients:** Egg, Onion, Tomato, Rice, Butter, Oil, Salt, Chili, Garlic, Chicken

**Aliases:** Onion = Piyaj, Tomato = Tomatoes, Chili = Chilli

**Substitutes:** Butter to Oil

**Recipes**

| ID | Recipe | Cuisine | Time | Diet tag | Required ingredients |
| --- | --- | --- | --- | --- | --- |
| R1 | Tomato Egg Curry | Bangladeshi | 25 min | Vegetarian | Egg, Onion, Tomato, Oil, Salt |
| R2 | Fried Rice | Bangladeshi | 20 min | Vegetarian | Rice, Egg, Butter, Onion, Salt |
| R3 | Chicken Curry | Bangladeshi | 45 min | Halal | Chicken, Onion, Garlic, Chili, Oil, Salt |
| R4 | Garlic Butter Rice | Italian | 15 min | Vegetarian | Rice, Butter, Garlic, Salt |
| R5 | Plain Omelette | Italian | 10 min | Vegetarian | Egg, Oil, Salt |

**Test users**

| User | Role | Pantry |
| --- | --- | --- |
| user_a | user | Egg, Onion, Tomato, Oil, Salt |
| user_b | user | Rice, Egg, Onion, Salt, Oil |
| user_c | user | (empty) |
| admin_1 | admin | n/a |

**Expected match scores for user_a** (Egg, Onion, Tomato, Oil, Salt)

| Recipe | Have | Required | Score | Missing |
| --- | --- | --- | --- | --- |
| R1 Tomato Egg Curry | 5 | 5 | 100% | none |
| R5 Plain Omelette | 3 | 3 | 100% | none |
| R2 Fried Rice | 3 | 5 | 60% | Rice, Butter |
| R3 Chicken Curry | 3 | 6 | 50% | Chicken, Garlic, Chili |
| R4 Garlic Butter Rice | 1 | 4 | 25% | Rice, Butter, Garlic |

---

## 5. Test Cases

Status values: Not run, Pass, Fail, Blocked. Priority: High, Medium, Low.

### 5.1 Account management (FR-1 to FR-3)

| ID | Requirement | Test case | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-001 | FR-1 | Register with valid data | Send valid name, new email, password of 8+ characters | Account created, status 201, role is `user`, no password in response | High |
| TC-002 | FR-1 | Register with duplicate email | Register again with the same email | Status 409 `DUPLICATE` | High |
| TC-003 | FR-1 | Register with invalid email | Send `abc` as email | Status 400 `VALIDATION_ERROR` | High |
| TC-004 | FR-1 | Register with short password | Send a 5-character password | Status 400 `VALIDATION_ERROR` | Medium |
| TC-005 | FR-2 | Log in with correct credentials | Send valid email and password | Status 200, token returned | High |
| TC-006 | FR-3 | Log in with wrong password | Send valid email, wrong password | Status 401 `INVALID_CREDENTIALS`, message does not say which field was wrong | High |
| TC-007 | FR-3 | Log in with unknown email | Send an unregistered email | Status 401 `INVALID_CREDENTIALS`, same message as TC-006 | High |
| TC-008 | FR-2 | Log out | Call logout with a valid token | Status 204, user returns to login page in the UI | Medium |
| TC-009 | NFR-7 | Access protected endpoint without token | Call `GET /pantry` with no token | Status 401 `TOKEN_INVALID` | High |
| TC-010 | NFR-7 | Use an expired token | Call `GET /pantry` with an expired token | Status 401 `TOKEN_INVALID` | Medium |

### 5.2 Ingredient input and pantry (FR-4 to FR-7)

| ID | Requirement | Test case | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-011 | FR-4 | Suggestions while typing | Search `on` | Onion appears in suggestions | High |
| TC-012 | FR-7 | Search by alias | Search `piyaj` | Onion returned with `matchedAlias` = Piyaj | High |
| TC-013 | FR-7 | Search is case-insensitive | Search `ONION` and `onion` | Same results for both | Medium |
| TC-014 | FR-4, FR-5 | Replace pantry with valid items | `PUT /pantry` with Egg, Onion, Tomato | Status 200, pantry holds exactly those 3 items | High |
| TC-015 | FR-7 | Add item by alias name | `PUT /pantry` with name `Piyaj` | Stored as Onion | High |
| TC-016 | FR-7 | Unknown ingredient name | `PUT /pantry` with name `xyzabc` | Status 422 `UNKNOWN_INGREDIENT`, pantry unchanged | High |
| TC-017 | FR-7 | Mixed valid and unknown names | Send 2 valid names and 1 unknown name | Status 422, nothing saved, unknown name listed in details | Medium |
| TC-018 | FR-5 | Add one item | `POST /pantry/items` with Butter | Status 201, Butter in pantry | High |
| TC-019 | FR-5 | Add a duplicate item | Add Butter again | Status 409 `DUPLICATE` | Medium |
| TC-020 | FR-5 | Remove an item | `DELETE /pantry/items/{id}` | Status 204, item gone from pantry | High |
| TC-021 | FR-5 | Remove item not in pantry | Delete an ingredient the user does not have | Status 404 | Low |
| TC-022 | FR-6 | Set an expiry date | Add Tomato with a future date | Date saved and returned | Medium |
| TC-023 | FR-6 | Reject a past expiry date | Add Tomato with yesterday's date | Status 400 `VALIDATION_ERROR` | Medium |
| TC-024 | FR-6 | Clear an expiry date | `PATCH` with `expiryDate: null` | Date removed | Low |
| TC-025 | FR-6 | Expiring-soon flag | Set expiry to 2 days from today | `expiringSoon` is `true` | Medium |
| TC-026 | FR-5 | Users cannot see each other's pantry | Log in as user_a, then user_b | Each sees only their own items | High |

### 5.3 Matching and ranking (FR-8 to FR-12)

| ID | Requirement | Test case | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-030 | FR-9 | Match score is correct | Get recommendations as user_a | Scores match the table in section 4 (R1 100, R5 100, R2 60, R3 50, R4 25) | High |
| TC-031 | FR-10 | Ranking order | Get recommendations as user_a | Order is by score, highest first | High |
| TC-032 | FR-10 | Tie-break by cooking time | Compare R1 and R5, both 100% | R5 (10 min) listed before R1 (25 min) when no expiring items | Medium |
| TC-033 | FR-11 | Expiring ingredient boost | Set Tomato to expire in 2 days, then get recommendations | R1 ranks above R5 because it uses an expiring ingredient | High |
| TC-034 | FR-11 | No boost for far expiry | Set Tomato to expire in 30 days | Order unchanged from TC-032 | Medium |
| TC-035 | FR-12 | Missing ingredients shown | Open R2 for user_a | Missing list shows Rice and Butter | High |
| TC-036 | FR-12 | Matched ingredients shown | Open R1 for user_a | All 5 ingredients marked as in pantry | Medium |
| TC-037 | FR-8 | Empty pantry | Get recommendations as user_c | Status 200, empty list, hint message shown | High |
| TC-038 | FR-8 | Recipes with zero matches are excluded | Pantry holds only Chicken | Recipes without Chicken do not appear | Medium |
| TC-039 | FR-9 | Alias counts as owned | Add `Piyaj` to the pantry | Onion-based recipes count Onion as owned | High |
| TC-040 | FR-9 | Same pantry gives same ranking | Request twice with no changes | Identical results (NFR-11) | Medium |
| TC-041 | FR-9 | Quantity is ignored | Pantry holds Egg regardless of amount | Score is the same | Low |

### 5.4 Near matches and substitutes (FR-13, FR-14)

| ID | Requirement | Test case | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-045 | FR-13 | Flag almost-achievable recipe | user_b gets recommendations (R2 missing only Butter) | R2 has `almostAchievable: true`, `missingCount: 1` | High |
| TC-046 | FR-13 | Two missing is still almost | Pantry missing 2 ingredients for a recipe | `almostAchievable: true` | High |
| TC-047 | FR-13 | Three missing is not almost | R3 for user_a (3 missing) | `almostAchievable: false` | High |
| TC-048 | FR-14 | Substitute shown | Open R2 for user_b | Butter shows Oil as a substitute with its note | High |
| TC-049 | FR-14 | No substitute available | Open recipe missing Chicken | Missing item listed, empty substitutes list | Medium |
| TC-050 | FR-13 | `almostOnly` filter | `GET /recommendations?almostOnly=true` | Only recipes with 1 or 2 missing items | Medium |

### 5.5 Filtering (FR-15, FR-16)

| ID | Requirement | Test case | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-055 | FR-15 | Filter by cuisine | `cuisine=Italian` ID | Only R4 and R5 | High |
| TC-056 | FR-15 | Filter by cooking time | `maxTime=20` | Only recipes of 20 minutes or less (R2, R4, R5) | High |
| TC-057 | FR-15 | Filter by dietary tag | `diet=Halal` | Only R3 | High |
| TC-058 | FR-16 | Combine filters | `cuisine=Bangladeshi&maxTime=30&diet=Vegetarian` | R1 and R2 only | High |
| TC-059 | FR-16 | Order kept after filtering | Apply filters | Remaining recipes stay sorted by score | High |
| TC-060 | FR-15 | Filter with no results | `maxTime=5` | Empty list, no error | Medium |
| TC-061 | FR-15 | Invalid filter value | `maxTime=abc` | Status 400 `VALIDATION_ERROR` | Medium |
| TC-062 | FR-15 | `minScore` filter | `minScore=60` as user_a | Only recipes scoring 60 or above | Low |

### 5.6 Recipe details and cooking (FR-17 to FR-19)

| ID | Requirement | Test case | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-065 | FR-17 | Select a recipe from the list | Click a recipe card | Details page opens for that recipe | High |
| TC-066 | FR-18 | Full details displayed | `GET /recipes/{id}` | Title, ingredients, ordered steps, image URL, time, cuisine, tags present | High |
| TC-067 | FR-18 | Steps in order | Open any recipe | Steps appear in `stepNumber` order | Medium |
| TC-068 | FR-18 | Recipe without image | Open a recipe with no image | Placeholder image shown, no broken image | Low |
| TC-069 | FR-18 | Recipe not found | `GET /recipes/9999` | Status 404 | Medium |
| TC-070 | FR-19 | Start cooking | Click "Start cooking" | Step-by-step cooking view opens | Low |

### 5.7 Administration (FR-20, FR-21)

| ID | Requirement | Test case | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- | --- |
| TC-075 | FR-20 | Admin creates a recipe | `POST /recipes` as admin_1 with valid data | Status 201, recipe appears in recommendations when matched | High |
| TC-076 | FR-20 | Admin updates a recipe | `PUT /recipes/{id}` | Changes saved | High |
| TC-077 | FR-20 | Admin deletes a recipe | `DELETE /recipes/{id}` | Status 204, recipe and its steps gone | High |
| TC-078 | NFR-7 | Normal user cannot create a recipe | `POST /recipes` as user_a | Status 403 `FORBIDDEN` | High |
| TC-079 | NFR-7 | Normal user cannot delete a recipe | `DELETE /recipes/{id}` as user_a | Status 403 | High |
| TC-080 | FR-20 | Recipe with unknown ingredient ID | Create recipe with ingredient ID 9999 | Status 404 | Medium |
| TC-081 | FR-21 | Admin creates ingredient with aliases | `POST /ingredients` | Ingredient and aliases saved, searchable | High |
| TC-082 | FR-21 | Duplicate ingredient name | Create `Onion` again | Status 409 | Medium |
| TC-083 | FR-21 | Admin adds substitute | `POST /substitutes` | Substitute appears on recipes missing that ingredient | High |
| TC-084 | FR-21 | Ingredient cannot substitute itself | Substitute with same ID on both sides | Status 400 | Medium |
| TC-085 | FR-21 | Remove substitute | `DELETE /substitutes` | Mapping removed | Low |

### 5.8 End-to-end flows

| ID | Flow | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| E2E-1 | Main user journey | Register, log in, enter ingredients, view recommendations, select a recipe, start cooking, log out | Every step succeeds and data carries from one page to the next | High |
| E2E-2 | Filter journey | Log in, enter ingredients, apply cuisine and time filters, open a recipe | Filtered list is correct, details match the card | High |
| E2E-3 | Almost-there journey | Enter ingredients that leave one item missing, view the recipe, read the substitute | Recipe flagged as almost achievable, substitute shown | High |
| E2E-4 | Admin journey | Admin adds a recipe, user enters its ingredients, recipe appears | New recipe is recommended | Medium |
| E2E-5 | Session expiry | Wait for token to expire, then act | User is sent to the login page with a clear message | Medium |

---

## 6. Non-Functional Tests

### 6.1 Performance (NFR-1, NFR-2)

| ID | Test | Method | Pass criteria |
| --- | --- | --- | --- |
| PT-1 | Recommendation response time | Request recommendations with a pantry of 30 ingredients against the full recipe set | 95% of responses within 3 seconds |
| PT-2 | Concurrent users | Ramp up to 50 virtual users doing the main flow for 5 minutes | No errors, 95th percentile still within 3 seconds |
| PT-3 | Large recipe set | Seed 5,000 recipes and repeat PT-1 | Still within 3 seconds, or query and indexes reviewed |
| PT-4 | Ingredient search speed | Type-ahead search under load | Suggestions return within 500 ms |

### 6.2 Security (NFR-6 to NFR-8)

| ID | Test | Method | Pass criteria |
| --- | --- | --- | --- |
| ST-1 | Password storage | Inspect the `users` table | Only salted hashes, no plain text |
| ST-2 | SQL injection | Send `' OR 1=1 --` in login, search and filter fields | Rejected or treated as plain text, no data leak |
| ST-3 | Cross-site scripting | Send `<script>alert(1)</script>` as a name and as ingredient text | Escaped, never executed |
| ST-4 | Role escalation | Normal user calls every admin endpoint | Always 403 |
| ST-5 | Data isolation | User A tries to read or change user B's pantry by changing IDs | Not possible |
| ST-6 | Token tampering | Edit the token payload and call the API | 401 `TOKEN_INVALID` |
| ST-7 | HTTPS only | Open the site over plain HTTP | Redirect to HTTPS or refusal |
| ST-8 | Error messages | Trigger a 500 error | No stack trace or database details shown |
| ST-9 | Login brute force | Repeated wrong passwords | Rate limit or lockout applies (if implemented) |

### 6.3 Usability and compatibility (NFR-3, NFR-4, NFR-9)

| ID | Test | Method | Pass criteria |
| --- | --- | --- | --- |
| UT-1 | First-time use | Ask 3 to 5 people, without help, to enter ingredients and open a recipe | Most finish without asking for help |
| UT-2 | Mobile layout | Open all pages at 375 px width | No horizontal scrolling, buttons easy to tap (at least 44 px) |
| UT-3 | Browser compatibility | Run the main flow in Chrome, Firefox, Edge, Safari | Same behavior in all four |
| UT-4 | Keyboard use | Complete the main flow with the keyboard only | Focus visible and order logical |
| UT-5 | Color independence | Check recipe cards in grayscale | Match status still clear from text and percentage |
| UT-6 | Contrast | Run an accessibility checker | Text meets 4.5:1 contrast |
| UT-7 | Empty and error states | View empty pantry, no results, network error | Clear, friendly message shown each time |

### 6.4 Reliability and maintainability (NFR-5, NFR-10, NFR-11)

| ID | Test | Method | Pass criteria |
| --- | --- | --- | --- |
| RT-1 | Availability during testing | Monitor the staging server during test periods | At least 99% uptime |
| RT-2 | Matching module isolation | Replace the matcher with a test stub | Interface and API still work |
| RT-3 | Repeatability | Run the same request 100 times | Identical ranking every time |
| RT-4 | Recovery | Restart the server during use | App returns to normal and no data is lost |

---

## 7. Unit Test Examples

Examples of the most important unit tests (written as Jest-style pseudocode).

```javascript
describe('calculateMatchScore', () => {
  test('returns 100 when the user has every ingredient', () => {
    expect(calculateMatchScore(['egg', 'oil'], ['egg', 'oil', 'salt'])).toBe(100);
  });

  test('returns 60 when the user has 3 of 5 ingredients', () => {
    expect(calculateMatchScore(['a', 'b', 'c', 'd', 'e'], ['a', 'b', 'c'])).toBe(60);
  });

  test('returns 0 when nothing matches', () => {
    expect(calculateMatchScore(['a', 'b'], ['x'])).toBe(0);
  });

  test('ignores duplicate pantry entries', () => {
    expect(calculateMatchScore(['a', 'b'], ['a', 'a'])).toBe(50);
  });
});

describe('rankRecipes', () => {
  test('sorts by score, then expiring count, then cooking time', () => {
    const ranked = rankRecipes([
      { id: 1, score: 100, expiring: 0, time: 25 },
      { id: 2, score: 100, expiring: 1, time: 30 },
      { id: 3, score: 100, expiring: 0, time: 10 },
      { id: 4, score: 80,  expiring: 3, time: 5 },
    ]);
    expect(ranked.map(r => r.id)).toEqual([2, 3, 1, 4]);
  });
});

describe('isAlmostAchievable', () => {
  test.each([[0, false], [1, true], [2, true], [3, false]])(
    'missing %i ingredients gives %s', (missing, expected) => {
      expect(isAlmostAchievable(missing)).toBe(expected);
    });
});

describe('normalizeIngredient', () => {
  test('matches a main name regardless of case', () => {
    expect(normalizeIngredient('ONION')).toEqual({ id: 2, name: 'Onion' });
  });
  test('matches an alias', () => {
    expect(normalizeIngredient('Piyaj')).toEqual({ id: 2, name: 'Onion' });
  });
  test('returns null for an unknown name', () => {
    expect(normalizeIngredient('xyzabc')).toBeNull();
  });
});
```

---

## 8. Requirements Traceability Matrix

| Requirement | Test cases |
| --- | --- |
| FR-1 | TC-001 to TC-004 |
| FR-2 | TC-005, TC-008 |
| FR-3 | TC-006, TC-007 |
| FR-4 | TC-011, TC-014 |
| FR-5 | TC-014, TC-018 to TC-021, TC-026 |
| FR-6 | TC-022 to TC-025 |
| FR-7 | TC-012, TC-013, TC-015 to TC-017 |
| FR-8 | TC-037, TC-038 |
| FR-9 | TC-030, TC-039 to TC-041 |
| FR-10 | TC-031, TC-032 |
| FR-11 | TC-033, TC-034 |
| FR-12 | TC-035, TC-036 |
| FR-13 | TC-045 to TC-047, TC-050 |
| FR-14 | TC-048, TC-049 |
| FR-15 | TC-055 to TC-057, TC-060 to TC-062 |
| FR-16 | TC-058, TC-059 |
| FR-17 | TC-065 |
| FR-18 | TC-066 to TC-069 |
| FR-19 | TC-070 |
| FR-20 | TC-075 to TC-077, TC-080 |
| FR-21 | TC-081 to TC-085 |
| NFR-1, NFR-2 | PT-1 to PT-4 |
| NFR-3, NFR-4 | UT-1, UT-2, UT-4 to UT-7 |
| NFR-5 | RT-1, RT-4 |
| NFR-6 | ST-1 |
| NFR-7 | TC-009, TC-010, TC-078, TC-079, ST-4, ST-5 |
| NFR-8 | ST-2, ST-3 |
| NFR-9 | UT-3 |
| NFR-10 | RT-2 |
| NFR-11 | TC-040, RT-3 |

---

## 9. Entry and Exit Criteria

**Entry criteria (testing can start)**

- Requirements and API reference are approved.
- Test environment and test database are ready and seeded.
- The feature builds and passes basic smoke checks.

**Exit criteria (testing is complete)**

- All High-priority test cases are executed and pass.
- At least 90% of all test cases pass.
- No open Critical or High severity defects.
- Medium defects are fixed or have an agreed workaround.
- Unit test coverage of the matching and ranking module is at least 80%.
- Performance targets (NFR-1, NFR-2) are met.

---

## 10. Defect Management

### 10.1 Severity levels

| Severity | Meaning | Example | Target |
| --- | --- | --- | --- |
| Critical | System unusable, data loss or security breach | Any user can read another user's pantry | Fix before any release |
| High | Core feature broken, no workaround | Match scores are wrong | Fix before release |
| Medium | Feature works partly, workaround exists | Filter fails when combined with another | Fix if time allows |
| Low | Cosmetic or minor | Misaligned badge | Fix when convenient |

### 10.2 Defect life cycle

`New` → `Assigned` → `In progress` → `Fixed` → `Retest` → `Closed`
A failed retest moves the defect back to `In progress`. A defect that cannot be reproduced is marked `Rejected` with a note.

### 10.3 Bug report template

```
ID:               BUG-000
Title:            Short, clear summary
Severity:         Critical / High / Medium / Low
Related test:     TC-000
Environment:      Browser and version, device, server (local or staging)
Steps to reproduce:
  1.
  2.
  3.
Expected result:
Actual result:
Evidence:         Screenshot, log or API response
Reported by:      Name, date
Assigned to:
Status:           New
```

---

## 11. QA Checklists

### 11.1 Pre-commit (developer)

- [ ] Code builds with no errors or warnings.
- [ ] New and changed code has unit tests.
- [ ] All unit tests pass locally.
- [ ] No secrets, passwords or `.env` files in the commit.
- [ ] Input validated on every new endpoint.

### 11.2 Pull request review

- [ ] Change matches the requirement it claims to cover.
- [ ] Naming and structure follow the project conventions.
- [ ] Error cases return the standard error format.
- [ ] Database queries are parameterized.
- [ ] No unrelated changes mixed in.
- [ ] Another team member has approved.

### 11.3 Before a demo or release

- [ ] Full automated suite passes (unit, integration, end to end).
- [ ] All High-priority manual test cases pass.
- [ ] Main user journey (E2E-1) works on desktop and mobile.
- [ ] Database is reset and loaded with clean demo data.
- [ ] Admin and user demo accounts work.
- [ ] No open Critical or High defects.
- [ ] README setup steps tested on a clean machine.
- [ ] HTTPS and environment variables checked.

### 11.4 Definition of done (per feature)

- [ ] Requirement implemented and reviewed.
- [ ] Unit and integration tests written and passing.
- [ ] Linked test cases executed.
- [ ] API reference and README updated if behavior changed.
- [ ] No known defects above Low severity.

---

## 12. Test Execution Tracker

Copy this table into a spreadsheet or the project board and fill it in during each test cycle.

| Test ID | Priority | Status | Tester | Date | Defect ID | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | High | Not run | | | | |
| TC-002 | High | Not run | | | | |
| TC-030 | High | Not run | | | | |
| TC-033 | High | Not run | | | | |
| E2E-1 | High | Not run | | | | |
| PT-1 | High | Not run | | | | |

---

## 13. Test Summary Report Template

```
Project:            CookMatch
Test cycle:         (name or number)
Build / version:
Period:             (start date to end date)
Environment:

Results
  Total test cases:       
  Passed:                 
  Failed:                 
  Blocked:                
  Pass rate:              

Defects
  Critical:   open / closed
  High:       open / closed
  Medium:     open / closed
  Low:        open / closed

Coverage
  Requirements covered:   (x of 32)
  Matching module unit coverage:  %

Performance
  95th percentile response time:  
  Concurrent users tested:        

Open risks and known issues:

Exit criteria met:   Yes / No
Recommendation:      Release / Release with known issues / Do not release

Prepared by:         Name, date
```

---

## 14. Risks and Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Incomplete recipe and ingredient database gives poor recommendations | Wrong or empty results | Seed a reviewed starter set; test with the fixed dataset in section 4 |
| Regional ingredient names do not match | Valid ingredients rejected | Add aliases; test alias lookup (TC-012, TC-015) |
| Ranking changes after the expiry weight is tuned | Old tests fail | Keep ranking tests in the regression suite and update them with the decision |
| Little time left for testing near the deadline | Defects reach the demo | Automate unit and integration tests early; run them on every commit |
| Test data differs between machines | Results cannot be repeated | Use one seed script for everyone |
| Security checks skipped | Data exposure | Treat ST-1 to ST-8 as High priority exit criteria |
