# CookMatch: Authentication and Security

How CookMatch identifies users, controls access, and protects data. It supports requirements FR-1 to FR-3 and NFR-6 to NFR-8, and it matches the endpoints in `api.md` and the tables in the database design.

> Values such as token lifetime, hashing cost and rate limits are proposed defaults. The team should confirm them during design.

---

## 1. Security Goals

| Goal | Meaning for CookMatch |
| --- | --- |
| Confidentiality | A user's account and pantry are visible only to that user |
| Integrity | Only authorized people can change recipes, ingredients and substitutes |
| Availability | The system stays usable and resists simple abuse |
| Accountability | Important events (logins, admin changes) are logged |

### 1.1 What needs protection

| Asset | Sensitivity |
| --- | --- |
| Passwords | Very high |
| Tokens and the `JWT_SECRET` | Very high |
| User email and name | High (personal data) |
| Pantry contents and expiry dates | Medium |
| Recipe, ingredient and substitute data | Low to medium (integrity matters most) |
| Database credentials and server access | Very high |

---

## 2. Authentication

### 2.1 Registration (FR-1)

- Required fields: name, email, password.
- Email must be valid and unique (case-insensitive).
- Password must be at least 8 characters. Proposed: also reject common passwords such as `password` or `12345678`.
- New accounts always get the role `user`. The role can never be set by the client; admin accounts are created by the team directly in the database or by an existing admin.
- The response never contains the password or its hash.

### 2.2 Password storage (NFR-6)

| Rule | Detail |
| --- | --- |
| Algorithm | bcrypt (or Argon2) with a unique salt per password |
| Cost | bcrypt cost factor of 10 to 12 |
| Storage | Only the hash is saved in `users.password_hash` |
| Never | Store plain text, store reversible encryption, log passwords, or email passwords |

```javascript
// Register
const hash = await bcrypt.hash(password, 12);

// Login
const ok = await bcrypt.compare(password, user.passwordHash);
```

### 2.3 Login (FR-2, FR-3)

1. The client sends email and password over HTTPS.
2. The server finds the user by email and compares the password with the stored hash.
3. On success it returns a signed token. On failure it returns `401 INVALID_CREDENTIALS`.

**Rules**

- Use the same message for a wrong email and a wrong password, so attackers cannot find out which emails exist.
- Compare in a way that takes similar time whether or not the email exists (run a bcrypt compare against a dummy hash when the user is not found).
- Log failed attempts with the user ID or a hashed email, never the password.

### 2.4 Tokens (JWT)

| Item | Proposed value |
| --- | --- |
| Type | Signed JWT (HS256, or RS256 if keys are managed separately) |
| Lifetime | 1 hour |
| Sent as | `Authorization: Bearer <token>` header |
| Secret | `JWT_SECRET` from the environment, at least 32 random characters |

Token payload (keep it small, with no sensitive data):

```json
{
  "sub": 12,
  "role": "user",
  "iat": 1760719200,
  "exp": 1760722800
}
```

**Rules**

- Always verify the signature and the `exp` time on every request.
- Take the user ID and role from the verified token, never from the request body or URL.
- Never put passwords, emails or pantry data in the token.
- Change the secret if it may have leaked; this logs everyone out.

### 2.5 Logout and sessions

- `POST /auth/logout` ends the session on the client. Because JWTs are stateless, the token stays valid until it expires.
- Proposed improvements: keep the lifetime short (1 hour), and optionally keep a small blacklist of logged-out tokens, or use refresh tokens that can be revoked.
- The client must delete the token from storage on logout and on any `401` response.

### 2.6 Where the client stores the token

| Option | Pros | Cons |
| --- | --- | --- |
| Memory only | Safest against theft by scripts | Lost on page reload |
| `HttpOnly`, `Secure`, `SameSite` cookie | Scripts cannot read it | Needs CSRF protection |
| `localStorage` | Simple | Readable by any injected script (XSS) |

Proposed: `HttpOnly` cookie with `SameSite=Strict`, or memory storage with a refresh flow. If the team chooses `localStorage` for simplicity, the XSS protections in section 5 become critical and the risk should be written down.

### 2.7 Brute-force protection

- Limit login attempts: for example 5 failed attempts per account and IP in 15 minutes, then a delay or temporary lock.
- Return `429 Too Many Requests` when the limit is hit.
- Apply a general rate limit (for example 100 requests per minute per user) to all endpoints.

---

## 3. Authorization

### 3.1 Roles (NFR-7)

| Role | Can do |
| --- | --- |
| Public (no login) | Register, log in |
| `user` | Manage own pantry, get recommendations, view recipes, search ingredients |
| `admin` | Everything a user can, plus create, edit and delete recipes, ingredients, aliases and substitutes |

### 3.2 Access matrix

| Endpoint | Public | User | Admin |
| --- | --- | --- | --- |
| `POST /auth/register`, `POST /auth/login` | Yes | Yes | Yes |
| `POST /auth/logout` | No | Yes | Yes |
| `GET /ingredients/search` | No | Yes | Yes |
| `/pantry` endpoints | No | Own data only | Own data only |
| `GET /recommendations` | No | Yes | Yes |
| `GET /recipes/{id}`, `/cuisines`, `/dietary-tags` | No | Yes | Yes |
| `POST/PUT/DELETE /recipes` | No | No (403) | Yes |
| `POST /ingredients`, `/ingredients/{id}/aliases` | No | No (403) | Yes |
| `POST/DELETE /substitutes` | No | No (403) | Yes |

### 3.3 Enforcement rules

- Check the token first (`401` if missing or invalid), then the role (`403` if not allowed).
- Run the role check as middleware before the handler, on every admin route.
- Deny by default: a new endpoint is admin-only or login-only until someone decides otherwise.
- Pantry queries always filter by the user ID from the token. This prevents one user from reading or changing another user's pantry (an "insecure direct object reference" bug).

```javascript
// Middleware example
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not allowed' } });
    }
    next();
  };
}

router.post('/recipes', authenticate, requireRole('admin'), createRecipe);
```

---

## 4. Data Protection

### 4.1 In transit

- HTTPS for every connection; redirect or refuse plain HTTP.
- Use TLS 1.2 or newer.
- Send the `Strict-Transport-Security` header so browsers always use HTTPS.

### 4.2 At rest

| Data | Protection |
| --- | --- |
| Passwords | Salted hash |
| Database | Strong password, no public access, access only from the app server |
| Backups | Stored privately, restricted access |
| Secrets | In environment variables, never in the code or the repository |

### 4.3 Data minimization

CookMatch only collects what it needs: name, email, password hash, and pantry items. Do not collect extra personal data. Return only the fields a screen needs, and never return `password_hash`.

### 4.4 Privacy basics

- Tell users what data is stored and why.
- Let users delete their account; deleting the user removes their pantry through `ON DELETE CASCADE`.
- Do not share user data with third parties.
- Keep personal data out of logs and error messages.

---

## 5. Input Validation and Attack Protection (NFR-8)

| Threat | How it could happen in CookMatch | Protection |
| --- | --- | --- |
| SQL injection | Malicious text in search, filters, login or ingredient names | Parameterized queries only; never build SQL by joining strings |
| Cross-site scripting (XSS) | Script in a name or ingredient shown on a page | Escape output (React does this by default); never use `dangerouslySetInnerHTML` with user data; set a Content Security Policy |
| Cross-site request forgery (CSRF) | A malicious site triggers actions using the user's cookie | `SameSite` cookies, or bearer tokens in headers; CSRF tokens if cookies are used |
| Broken access control | User changes an ID in the URL to reach another user's data | Take the user from the token; check ownership; role middleware |
| Mass assignment | Client sends `"role": "admin"` in registration | Accept only expected fields; ignore the rest |
| Brute force | Guessing passwords | Rate limit, lockout, strong password rules |
| Token theft or tampering | Stolen or edited token | Short lifetime, signature check, HTTPS, safe storage |
| Denial of service | Huge requests or floods | Rate limits, request size limit (for example 100 KB), pagination limits (max 50) |
| Information leak | Stack traces and database errors in responses | Generic error messages for `500`; details only in server logs |
| Insecure uploads | Image URLs that point to harmful files | Store only URLs, validate them, and do not fetch or run them on the server |

### 5.1 Validation rules

| Field | Rule |
| --- | --- |
| `email` | Valid format, max 255 characters, lowercase before saving |
| `password` | 8 to 72 characters (bcrypt reads only the first 72 bytes) |
| `name` | 1 to 100 characters, trimmed |
| Ingredient name | 1 to 100 characters, trimmed |
| IDs | Positive integers |
| Dates | Valid ISO date; expiry date not in the past |
| `maxTime`, `limit`, `page` | Positive integers within allowed ranges |
| `imageUrl` | Valid `https` URL |
| Arrays | Maximum length (for example 100 pantry items) |

Validate on the server even if the frontend already validates. The frontend check is for convenience, not security.

---

## 6. Secure Headers and Configuration

Use a helper such as `helmet` in Express, and confirm these headers:

| Header | Purpose |
| --- | --- |
| `Strict-Transport-Security` | Force HTTPS |
| `Content-Security-Policy` | Limit where scripts and images can load from |
| `X-Content-Type-Options: nosniff` | Stop type guessing |
| `X-Frame-Options: DENY` | Prevent clickjacking |
| `Referrer-Policy` | Limit referrer data |

**CORS:** allow only the known frontend origin, not `*`.

**Environment:**

- Keep `.env` out of version control (add it to `.gitignore`).
- Use different secrets for development, testing and production.
- Run the database user with the minimum rights the app needs (no superuser).
- Keep dependencies updated and run `npm audit` regularly.

---

## 7. Logging and Monitoring

| Log this | Do not log this |
| --- | --- |
| Logins (success and failure), logouts | Passwords, hashes, tokens |
| Registrations | Full request bodies of `/auth` endpoints |
| Admin actions (create, update, delete) with user ID and time | Secrets and connection strings |
| Authorization failures (`401`, `403`) | Personal data that is not needed |
| Rate limit hits and server errors | |

Review logs for repeated failed logins, many `403` responses from one user, and sudden traffic spikes.

---

## 8. Incident Response

If a problem is found (for example a leaked secret or a data exposure):

1. **Contain:** change the leaked secret (this invalidates all tokens), disable the affected account or endpoint.
2. **Assess:** find what data was exposed and for how long, using the logs.
3. **Fix:** patch the cause and add a test for it.
4. **Notify:** tell affected users if their data was exposed.
5. **Review:** write down what happened and how to prevent it.

---

## 9. Security Checklist

### 9.1 Before release

- [ ] Passwords are stored as salted hashes only.
- [ ] `JWT_SECRET` is long, random and kept out of the repository.
- [ ] Every protected route checks the token, and every admin route checks the role.
- [ ] Pantry queries filter by the user ID from the token.
- [ ] All database queries are parameterized.
- [ ] All input is validated on the server.
- [ ] Output is escaped; no raw HTML from user data.
- [ ] HTTPS is on and HTTP is redirected or refused.
- [ ] Security headers and a strict CORS policy are set.
- [ ] Rate limits are on for login and general requests.
- [ ] Error responses leak no stack traces or database details.
- [ ] Debug logs and test accounts are removed.
- [ ] `npm audit` shows no known high-severity issues.
- [ ] `.env` is not committed.

### 9.2 Linked tests

| Check | Test IDs (see `testing_and_qa.md`) |
| --- | --- |
| Password storage | ST-1 |
| SQL injection | ST-2 |
| Cross-site scripting | ST-3 |
| Role escalation | ST-4, TC-078, TC-079 |
| Data isolation between users | ST-5, TC-026 |
| Token tampering and expiry | ST-6, TC-009, TC-010 |
| HTTPS only | ST-7 |
| Error message leaks | ST-8 |
| Brute force | ST-9 |

---

## 10. Open Decisions for the Team

- Where the client keeps the token (cookie, memory, or `localStorage`) and the risk that comes with the choice.
- Token lifetime, and whether to add refresh tokens and a revocation list.
- Exact rate limits and the lockout rule for failed logins.
- Whether to add email verification and password reset (not in the current requirements).
- Whether admin accounts need extra protection such as two-factor authentication.
- How long to keep logs.

## 11. Mapping to Requirements

| Requirement | Covered in |
| --- | --- |
| FR-1 Register | 2.1, 2.2 |
| FR-2 Log in and log out | 2.3, 2.4, 2.5 |
| FR-3 Reject invalid credentials | 2.3 |
| NFR-6 Password hashing | 2.2 |
| NFR-7 Role-based access | 3 |
| NFR-8 Input sanitization | 5 |
| NFR-9 and HTTPS requirement | 4.1, 6 |
