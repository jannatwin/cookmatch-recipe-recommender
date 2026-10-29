# CookMatch API Reference

JSON API contract for CookMatch Route Handlers, where an endpoint is implemented. The primary application is Next.js App Router and may use Server Actions for internal form mutations; do not add a separate Express API server. Authentication is Supabase Auth with cookie-based SSR sessions. This endpoint reference describes app-level behavior, not a custom JWT implementation.

> The base URL and payloads below are proposed app-level contracts. Reconcile endpoint shapes with actual Route Handlers during implementation. See `implementation.md` for the selected stack.

---

## 1. Conventions

| Item | Value |
| --- | --- |
| Base URL | Same-origin Next.js routes, for example `https://cookmatch.example/api/v1` |
| Format | JSON (`Content-Type: application/json`) for requests and responses |
| Transport | HTTPS only |
| Authentication | Supabase Auth session cookies for same-origin browser requests; server validates the session |
| Roles | `user`, `admin` |
| Dates | ISO 8601 (`2026-10-20`) |
| IDs | Catalog IDs may be numeric; Supabase Auth user IDs are UUIDs |
| Naming | `camelCase` in JSON fields |

### 1.1 Access levels

| Level | Meaning |
| --- | --- |
| Public | No authenticated Supabase session required |
| User | Valid Supabase Auth session (admins also pass) |
| Admin | Valid session and server-verified `admin` profile role |

### 1.2 Standard error format

Every error uses the same body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is not valid",
    "details": [
      { "field": "email", "issue": "must be a valid email address" }
    ]
  }
}
```

### 1.3 Status codes

| Code | Meaning | Typical use |
| --- | --- | --- |
| 200 | OK | Successful read or update |
| 201 | Created | Resource created |
| 204 | No Content | Successful delete |
| 400 | Bad Request | Validation failed, malformed input |
| 401 | Unauthorized | Missing/invalid session or wrong credentials |
| 403 | Forbidden | Token is valid but role is not allowed |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate email, ingredient or alias |
| 422 | Unprocessable Entity | Unknown ingredient names in a pantry request |
| 429 | Too Many Requests | Authentication or provider request is rate limited |
| 500 | Server Error | Unexpected failure |

### 1.4 Error codes

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | One or more fields are invalid |
| `INVALID_CREDENTIALS` | 401 | Email or password is wrong |
| `TOKEN_INVALID` | 401 | Supabase session missing, invalid or expired |
| `RATE_LIMITED` | 429 | Request limit reached; retry after a delay |
| `FORBIDDEN` | 403 | Role not allowed for this endpoint |
| `NOT_FOUND` | 404 | Resource does not exist |
| `DUPLICATE` | 409 | Value already exists (for example email) |
| `UNKNOWN_INGREDIENT` | 422 | Name matches no ingredient or alias |
| `SERVER_ERROR` | 500 | Unexpected server problem |

### 1.5 Pagination

List endpoints that can return many items accept:

| Parameter | Default | Max | Meaning |
| --- | --- | --- | --- |
| `page` | 1 | n/a | Page number, starting at 1 |
| `limit` | 20 | 50 | Items per page |

Paginated responses include:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "totalItems": 87, "totalPages": 5 }
}
```

---

## 2. Endpoint Summary

| # | Method | Endpoint | Purpose | Access | Requirement |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/auth/register` | Create an account | Public | FR-1 |
| 2 | POST | `/auth/login` | Log in and establish a Supabase session | Public | FR-2, FR-3 |
| 3 | POST | `/auth/logout` | Log out | User | FR-2 |
| 4 | GET | `/ingredients/search` | Ingredient name suggestions | User | FR-4, FR-7 |
| 5 | GET | `/pantry` | Get the user's pantry | User | FR-5 |
| 6 | PUT | `/pantry` | Replace the user's pantry | User | FR-4, FR-5, FR-6, FR-7 |
| 7 | POST | `/pantry/items` | Add one ingredient | User | FR-5, FR-6 |
| 8 | PATCH | `/pantry/items/{ingredientId}` | Update an expiry date | User | FR-6 |
| 9 | DELETE | `/pantry/items/{ingredientId}` | Remove one ingredient | User | FR-5 |
| 10 | GET | `/recommendations` | Ranked recipes for the pantry | User | FR-8 to FR-16 |
| 11 | GET | `/recipes/{id}` | Full recipe details | User | FR-17, FR-18 |
| 12 | GET | `/cuisines` | List cuisines (for filters) | User | FR-15 |
| 13 | GET | `/dietary-tags` | List dietary tags (for filters) | User | FR-15 |
| 14 | POST | `/recipes` | Create a recipe | Admin | FR-20 |
| 15 | PUT | `/recipes/{id}` | Update a recipe | Admin | FR-20 |
| 16 | DELETE | `/recipes/{id}` | Delete a recipe | Admin | FR-20 |
| 17 | POST | `/ingredients` | Create an ingredient | Admin | FR-21 |
| 18 | POST | `/ingredients/{id}/aliases` | Add an alias | Admin | FR-21 |
| 19 | POST | `/substitutes` | Create a substitute mapping | Admin | FR-21 |
| 20 | DELETE | `/substitutes` | Remove a substitute mapping | Admin | FR-21 |
| 21 | GET | `/providers/recipes?source=...` | Search a selected provider using the current pantry | User | FR-8 to FR-14 |
| 22 | GET | `/providers/recipes/{source}/{id}` | Load selected provider recipe details | User | FR-17, FR-18 |
| 23 | GET | `/admin/catalog` | List CookMatch-owned recipes and catalog values for admin tools | Admin | FR-20, FR-21 |

---

## 3. Authentication

For the browser application, register/login/logout are implemented through Supabase Auth using the configured SSR cookie flow. The `/auth/*` shapes below describe the logical app contract only; do not create custom password verification or issue a CookMatch JWT. If a non-browser API client is added later, document its supported Supabase access-token flow explicitly.

### 3.1 Register

`POST /auth/register`  ·  Public

Creates a new user account with the role `user`.

Request body:

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | yes | 1 to 100 characters |
| `email` | string | yes | Valid email, unique |
| `password` | string | yes | At least 8 characters |

```json
{
  "name": "Saske",
  "email": "saske@example.com",
  "password": "StrongPass123"
}
```

Response `201 Created`:

```json
{
  "userId": "8d5d0f54-0e1e-4bba-a26e-9a3c9d8c19b2",
  "name": "Saske",
  "email": "saske@example.com",
  "role": "user",
  "createdAt": "2026-10-17T16:30:00Z"
}
```

Errors: `400 VALIDATION_ERROR`, `409 DUPLICATE` (email already registered).

### 3.2 Log in

`POST /auth/login`  ·  Public

Request body:

```json
{
  "email": "saske@example.com",
  "password": "StrongPass123"
}
```

Response `200 OK` (logical app response; the browser session is established by Supabase Auth and stored in a secure cookie, not returned as an app-managed bearer token):

```json
{
  "user": {
    "userId": "8d5d0f54-0e1e-4bba-a26e-9a3c9d8c19b2",
    "name": "Saske",
    "role": "user"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS` (the message never says whether the email or the password was wrong).

### 3.3 Log out

`POST /auth/logout`  ·  User

Ends the Supabase Auth session and clears the session cookie.

Response `204 No Content`.

Errors: `401 TOKEN_INVALID`.

---

## 4. Ingredients and Pantry

### 4.1 Search ingredients

`GET /ingredients/search?q={text}`  ·  User

Returns ingredient suggestions as the user types. Matches both main names and aliases, case-insensitive.

| Query parameter | Type | Required | Meaning |
| --- | --- | --- | --- |
| `q` | string | yes | At least 1 character |
| `limit` | integer | no | Max suggestions, default 10 |

Request: `GET /ingredients/search?q=pi`

Response `200 OK`:

```json
{
  "data": [
    { "ingredientId": 2, "name": "Onion", "matchedAlias": "Piyaj" },
    { "ingredientId": 31, "name": "Pineapple", "matchedAlias": null }
  ]
}
```

`matchedAlias` is set when the match came from an alias instead of the main name.

### 4.2 Get pantry

`GET /pantry`  ·  User

Response `200 OK`:

```json
{
  "data": [
    {
      "ingredientId": 1,
      "name": "Egg",
      "expiryDate": null,
      "expiringSoon": false
    },
    {
      "ingredientId": 3,
      "name": "Tomato",
      "expiryDate": "2026-10-19",
      "expiringSoon": true
    }
  ]
}
```

`expiringSoon` is `true` when the expiry date falls within the warning window (proposed: 3 days).

### 4.3 Replace pantry

`PUT /pantry`  ·  User

Replaces the user's entire pantry with the list sent. Each item is given as an ingredient ID or as a typed name. Typed names are normalized against ingredient names and aliases.

Request body:

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `items` | array | yes | 1 to 100 items |
| `items[].ingredientId` | integer | one of | Existing ingredient ID |
| `items[].name` | string | one of | Typed name, matched to an ingredient or alias |
| `items[].expiryDate` | string | no | Date, not in the past |

```json
{
  "items": [
    { "name": "egg" },
    { "ingredientId": 3, "expiryDate": "2026-10-19" },
    { "name": "Piyaj" }
  ]
}
```

Response `200 OK`:

```json
{
  "data": [
    { "ingredientId": 1, "name": "Egg", "expiryDate": null },
    { "ingredientId": 3, "name": "Tomato", "expiryDate": "2026-10-19" },
    { "ingredientId": 2, "name": "Onion", "expiryDate": null }
  ]
}
```

Errors: `400 VALIDATION_ERROR`, `422 UNKNOWN_INGREDIENT`. If any name is unknown, nothing is saved and the response lists every name that failed:

```json
{
  "error": {
    "code": "UNKNOWN_INGREDIENT",
    "message": "Some ingredients were not recognized",
    "details": [
      { "field": "items[3].name", "issue": "no ingredient or alias matches 'tomatoe'" }
    ]
  }
}
```

### 4.4 Add one pantry item

`POST /pantry/items`  ·  User

Request body: one item, same fields as in 4.3.

```json
{ "name": "Butter", "expiryDate": "2026-11-02" }
```

Response `201 Created`:

```json
{ "ingredientId": 5, "name": "Butter", "expiryDate": "2026-11-02" }
```

Errors: `400 VALIDATION_ERROR`, `409 DUPLICATE` (already in the pantry), `422 UNKNOWN_INGREDIENT`.

### 4.5 Update a pantry item's expiry date

`PATCH /pantry/items/{ingredientId}`  ·  User

```json
{ "expiryDate": "2026-10-25" }
```

Send `"expiryDate": null` to clear the date.

Response `200 OK`:

```json
{ "ingredientId": 5, "name": "Butter", "expiryDate": "2026-10-25" }
```

Errors: `400 VALIDATION_ERROR`, `404 NOT_FOUND` (not in this user's pantry).

### 4.6 Remove a pantry item

`DELETE /pantry/items/{ingredientId}`  ·  User

Response `204 No Content`.

Errors: `404 NOT_FOUND`.

---

## 5. Recommendations

### 5.1 Get ranked recipes

`GET /recommendations`  ·  User

Ranks recipes using the logged-in user's current pantry. Recipes are sorted by match score (highest first), then by the number of expiring ingredients used (highest first), then by cooking time (shortest first).

| Query parameter | Type | Required | Meaning |
| --- | --- | --- | --- |
| `cuisine` | integer | no | Cuisine ID |
| `maxTime` | integer | no | Maximum cooking time in minutes |
| `diet` | string | no | Dietary tag name, for example `Vegetarian` |
| `almostOnly` | boolean | no | `true` returns only recipes missing 1 or 2 ingredients |
| `minScore` | number | no | Minimum match score, 0 to 100 |
| `page`, `limit` | integer | no | Pagination (see 1.5) |

Filters can be combined. The ranking order is kept inside the filtered results (FR-16).

Request: `GET /recommendations?cuisine=1&maxTime=30&diet=Vegetarian`

Response `200 OK`:

```json
{
  "data": [
    {
      "recipeId": 7,
      "title": "Tomato Egg Curry",
      "cuisine": "Bangladeshi",
      "cookingTimeMin": 25,
      "imageUrl": "https://cdn.cookmatch.example/recipes/7.jpg",
      "dietaryTags": ["Vegetarian"],
      "matchScore": 100.0,
      "requiredCount": 5,
      "haveCount": 5,
      "missingCount": 0,
      "expiringCount": 1,
      "almostAchievable": false,
      "missingIngredients": []
    },
    {
      "recipeId": 15,
      "title": "Fried Rice",
      "cuisine": "Bangladeshi",
      "cookingTimeMin": 20,
      "imageUrl": "https://cdn.cookmatch.example/recipes/15.jpg",
      "dietaryTags": ["Vegetarian"],
      "matchScore": 80.0,
      "requiredCount": 5,
      "haveCount": 4,
      "missingCount": 1,
      "expiringCount": 0,
      "almostAchievable": true,
      "missingIngredients": [
        {
          "ingredientId": 5,
          "name": "Butter",
          "substitutes": [
            { "ingredientId": 6, "name": "Oil", "note": "Use oil instead of butter for frying" }
          ]
        }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "totalItems": 2, "totalPages": 1 }
}
```

Field notes:

| Field | Meaning |
| --- | --- |
| `matchScore` | Percentage of required ingredients the user has (quantities are ignored) |
| `almostAchievable` | `true` when `missingCount` is 1 or 2 |
| `expiringCount` | How many of the matched ingredients are close to expiry |
| `missingIngredients` | Missing items with substitutes, when any exist |

Errors: `400 VALIDATION_ERROR` (bad filter value), `401 TOKEN_INVALID`.

An empty pantry returns `200 OK` with an empty `data` array and a `hint` field:

```json
{ "data": [], "hint": "Add ingredients to your pantry to get recommendations" }
```

---

## 6. Recipes

### 6.1 Get recipe details

`GET /recipes/{id}`  ·  User

Returns the full recipe. If the user has a pantry, the response also marks which ingredients the user has and which are missing.

Response `200 OK`:

```json
{
  "recipeId": 15,
  "title": "Fried Rice",
  "description": "Quick fried rice with egg and vegetables.",
  "cuisine": "Bangladeshi",
  "cookingTimeMin": 20,
  "imageUrl": "https://cdn.cookmatch.example/recipes/15.jpg",
  "dietaryTags": ["Vegetarian"],
  "ingredients": [
    { "ingredientId": 4, "name": "Rice", "inPantry": true },
    { "ingredientId": 1, "name": "Egg", "inPantry": true },
    { "ingredientId": 5, "name": "Butter", "inPantry": false,
      "substitutes": [ { "ingredientId": 6, "name": "Oil", "note": "Use oil instead of butter for frying" } ] }
  ],
  "steps": [
    { "stepNumber": 1, "instruction": "Heat the oil in a pan." },
    { "stepNumber": 2, "instruction": "Add the egg and scramble lightly." },
    { "stepNumber": 3, "instruction": "Add the rice and stir for 3 minutes." }
  ],
  "matchScore": 66.7,
  "missingCount": 1
}
```

Errors: `404 NOT_FOUND`.

### 6.2 List cuisines

`GET /cuisines`  ·  User

```json
{ "data": [ { "cuisineId": 1, "name": "Bangladeshi" }, { "cuisineId": 2, "name": "Italian" } ] }
```

### 6.3 List dietary tags

`GET /dietary-tags`  ·  User

```json
{ "data": [ { "tagId": 1, "name": "Vegetarian" }, { "tagId": 2, "name": "Vegan" }, { "tagId": 3, "name": "Halal" } ] }
```

---

## 7. Administration

All endpoints in this section require the `admin` role. A normal user receives `403 FORBIDDEN`.

### 7.0 Read the admin catalog

`GET /admin/catalog` · Admin

Returns CookMatch-owned recipes (including drafts), ingredients, aliases, cuisines, dietary tags and substitute mappings for the catalog management screen. Provider-owned records are not included.

Response `200 OK`: `{ "recipes": [], "ingredients": [], "aliases": [], "cuisines": [], "dietaryTags": [], "substitutes": [] }`. Each recipe includes editable ingredient IDs, dietary tag IDs and ordered instructions.

Errors: `401 TOKEN_INVALID`, `403 FORBIDDEN`, `500 SERVER_ERROR`.

### 7.1 Create a recipe

`POST /recipes`  ·  Admin

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `title` | string | yes | 1 to 200 characters |
| `description` | string | no | Free text |
| `cuisineId` | integer | no | Existing cuisine |
| `cookingTimeMin` | integer | yes | Greater than 0 |
| `imageUrl` | string | no | Valid URL |
| `dietaryTagIds` | integer[] | no | Existing tag IDs |
| `ingredientIds` | integer[] | yes | At least 1, existing ingredient IDs |
| `steps` | array | yes | At least 1 item, each with `instruction` (steps are numbered in the order sent) |

```json
{
  "title": "Fried Rice",
  "description": "Quick fried rice with egg and vegetables.",
  "cuisineId": 1,
  "cookingTimeMin": 20,
  "imageUrl": "https://cdn.cookmatch.example/recipes/15.jpg",
  "dietaryTagIds": [1],
  "ingredientIds": [4, 1, 5, 2, 6],
  "steps": [
    { "instruction": "Heat the oil in a pan." },
    { "instruction": "Add the egg and scramble lightly." },
    { "instruction": "Add the rice and stir for 3 minutes." }
  ]
}
```

Response `201 Created`: the full recipe, in the same shape as 6.1.

Errors: `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 NOT_FOUND` (an ingredient, cuisine or tag ID does not exist).

### 7.2 Update a recipe

`PUT /recipes/{id}`  ·  Admin

Same body as 7.1. The recipe's ingredients, tags and steps are replaced by the lists sent.

Response `200 OK`: the updated recipe.

Errors: `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### 7.3 Delete a recipe

`DELETE /recipes/{id}`  ·  Admin

Deletes the recipe with its ingredient links, steps and tags.

Response `204 No Content`.

Errors: `403 FORBIDDEN`, `404 NOT_FOUND`.

### 7.4 Create an ingredient

`POST /ingredients`  ·  Admin

```json
{ "name": "Coriander", "aliases": ["Dhone Pata", "Cilantro"] }
```

Response `201 Created`:

```json
{
  "ingredientId": 44,
  "name": "Coriander",
  "aliases": ["Dhone Pata", "Cilantro"]
}
```

Errors: `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `409 DUPLICATE` (name or an alias already exists).

### 7.5 Add an alias

`POST /ingredients/{id}/aliases`  ·  Admin

```json
{ "alias": "Dhania" }
```

Response `201 Created`:

```json
{ "aliasId": 91, "ingredientId": 44, "alias": "Dhania" }
```

Errors: `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE`.

### 7.6 Create a substitute mapping

`POST /substitutes`  ·  Admin

```json
{
  "ingredientId": 5,
  "substituteId": 6,
  "note": "Use oil instead of butter for frying"
}
```

Response `201 Created`:

```json
{ "ingredientId": 5, "substituteId": 6, "note": "Use oil instead of butter for frying" }
```

Errors: `400 VALIDATION_ERROR` (an ingredient cannot substitute itself), `403 FORBIDDEN`, `404 NOT_FOUND`, `409 DUPLICATE`.

### 7.7 Remove a substitute mapping

`DELETE /substitutes`  ·  Admin

```json
{ "ingredientId": 5, "substituteId": 6 }
```

Response `204 No Content`.

Errors: `403 FORBIDDEN`, `404 NOT_FOUND`.

## 8. External recipe providers

### 8.1 Search a provider

`GET /providers/recipes?source=themealdb&limit=5` · User

The user must have a non-empty pantry. `source` is `themealdb` or `spoonacular`; `limit` is 1–10 (TheMealDB is capped at 5 because the free V1 API searches ingredients individually). The request is performed server-side and results are not persisted to the CookMatch catalog. Results include an ingredient match score calculated against the user's canonical pantry and provider attribution. Spoonacular search requests are limited to 30 per user per hour.

Errors: `400 VALIDATION_ERROR`, `401 TOKEN_INVALID`, `429 RATE_LIMITED`, `502` when the provider is unavailable, or `503` when a provider key is not configured.

### 8.2 Provider recipe details

`GET /providers/recipes/{source}/{id}` · User

Loads one recipe from its selected provider, maps ingredients to the CookMatch catalog where possible, marks pantry matches and includes source attribution. Spoonacular detail requests are limited to 30 per user per hour. Provider terms, API quotas and image/data use restrictions still apply.

---

## 9. Typical Client Flow

The calls below follow the system's main activity flow.

| Step | User action | Call |
| --- | --- | --- |
| 1 | Register | `POST /auth/register` |
| 2 | Log in | Supabase Auth sign-in (session stored using the configured secure cookie flow) |
| 3 | Type ingredient names | `GET /ingredients/search?q=...` |
| 4 | Submit available ingredients | `PUT /pantry` |
| 5 | View recommended recipes | `GET /recommendations` |
| 6 | Apply filters | `GET /recommendations?cuisine=...&maxTime=...&diet=...` |
| 7 | Select a recipe | `GET /recipes/{id}` |
| 8 | Start cooking | Client shows the `steps` from step 7 |
| 9 | Log out | Supabase Auth sign-out (clear the session cookie) |

---

## 10. Security Notes

| Concern | Rule |
| --- | --- |
| Transport | HTTPS only; reject plain HTTP |
| Passwords | Managed by Supabase Auth; never stored or returned by CookMatch tables |
| Sessions | Supabase Auth cookie-based SSR session; do not implement a parallel app JWT |
| Authorization | Role checked in server code and enforced by RLS; users can only read/change their own pantry |
| Input | Validate and sanitize every field; use parameterized queries only |
| Errors | Do not reveal internal details or stack traces in error messages |
| Rate limiting | Proposed: limit login attempts to slow down password guessing |

---

## 11. Open Decisions for the Team

- Supabase Auth session duration and refresh behavior should use the configured Supabase Auth policy.
- Length of the "expiring soon" window (currently proposed as 3 days) and the weight of the expiry boost in ranking.
- Whether the `PUT /pantry` replace-all call is enough or the app should also use the single-item endpoints.
- Whether to add password reset and email verification (not in the current requirements).
