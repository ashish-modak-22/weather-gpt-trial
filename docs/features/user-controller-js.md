# user.controller.js — Explanation

This controller handles all user-authentication-related logic for the API. It works together with **Firebase Admin SDK** (identity/auth) and **MongoDB via Mongoose** (app-level profile data). Every handler is wrapped in `asyncHandler` so thrown errors are automatically passed to Express's error middleware via `next(err)`.

## Imports

```js
import { User } from "../models/user.model.js";
import { ApiResponse, ApiError } from "../utils/Async.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import adminAuth from "../config/firebase.js";
```

- `User` — Mongoose model, stores the app-level profile (`firebaseUID`, `userName`, `fullName`, `email`, `isVerified`).
- `ApiResponse` / `ApiError` — standard shape for success/error JSON responses.
- `asyncHandler` — wraps async route handlers so you don't need try/catch everywhere.
- `adminAuth` — Firebase Admin `Auth` instance, used for anything that touches the Firebase user record itself (revoking tokens, updating passwords, deleting accounts, generating links).

---

## File Interlink Diagram

This shows how `user.controller.js` sits in the middle of the request flow and which files it depends on.

```mermaid
graph TD
    A[server.js] --> B[app.js]
    B --> C[routes/user.route.js]
    C --> D[middleware/verifyFirebaseToken.js]
    D --> E[config/firebase.js<br/>adminAuth]
    C --> F[controllers/user.controller.js]

    F --> E
    F --> G[models/user.model.js<br/>User]
    F --> H[utils/Async.js<br/>ApiResponse / ApiError]
    F --> I[utils/asyncHandler.js<br/>asyncHandler]

    G --> J[(MongoDB)]
    E --> K[(Firebase Auth)]

    style F fill:#4a90d9,color:#fff
    style E fill:#e8a33d,color:#fff
    style G fill:#5cb85c,color:#fff
```

**Reading this diagram:**
- `server.js` boots the app and connects to MongoDB, then hands off to `app.js`.
- `app.js` mounts `user.route.js` under `/api/v1/auth`.
- Protected routes first pass through `verifyFirebaseToken` middleware, which uses `adminAuth` (from `config/firebase.js`) to decode the incoming ID token into `req.firebaseUser`.
- The controller itself talks to **two systems**: `adminAuth` (Firebase — identity/auth operations) and `User` model (MongoDB — app profile data).
- `Async.js` and `asyncHandler.js` are cross-cutting utilities used by almost every handler.

---

## Request Flow — Protected Route (e.g. `/me`, `/update-profile`)

```mermaid
sequenceDiagram
    participant Client
    participant Route as user.route.js
    participant MW as verifyFirebaseToken
    participant Firebase as adminAuth (Firebase)
    participant Ctrl as user.controller.js
    participant DB as MongoDB (User model)

    Client->>Route: Request + Authorization: Bearer <idToken>
    Route->>MW: verifyFirebaseToken(req, res, next)
    MW->>Firebase: adminAuth.verifyIdToken(idToken)
    Firebase-->>MW: decoded token (uid, email, email_verified)
    MW->>MW: req.firebaseUser = decodedToken
    MW->>Ctrl: next() → handler runs
    Ctrl->>DB: findOne / findOneAndUpdate (firebaseUID)
    DB-->>Ctrl: user document
    Ctrl-->>Client: ApiResponse(200, user, message)
```

If `verifyIdToken` fails (expired/invalid token), the middleware throws `ApiError(401)` and the controller never runs.

---

## Workflow: `registerUser`

```mermaid
sequenceDiagram
    participant Client
    participant MW as verifyFirebaseToken
    participant Ctrl as registerUser
    participant DB as MongoDB

    Client->>MW: POST /register + idToken + {userName, fullName}
    MW-->>Ctrl: req.firebaseUser = {uid, email, email_verified}
    Ctrl->>Ctrl: validate userName & fullName present
    Ctrl->>DB: findOne({firebaseUID: uid})
    alt already exists
        DB-->>Ctrl: existing user
        Ctrl-->>Client: 409 User already registered
    else not found
        DB-->>Ctrl: null
        Ctrl->>DB: create({firebaseUID, email, userName, fullName, isVerified})
        DB-->>Ctrl: new user
        Ctrl-->>Client: 201 User registered
    end
```

---

## Workflow: `loginUser`

```mermaid
sequenceDiagram
    participant Client
    participant Ctrl as loginUser
    participant DB as MongoDB

    Client->>Ctrl: POST /login + idToken
    Ctrl->>DB: findOne({firebaseUID: uid})
    alt not found
        DB-->>Ctrl: null
        Ctrl-->>Client: 404 Register first
    else found
        DB-->>Ctrl: user
        Ctrl->>Ctrl: compare user.isVerified vs token.email_verified
        opt out of sync
            Ctrl->>DB: user.save() with updated isVerified
        end
        Ctrl-->>Client: 200 Login successful
    end
```

---

## Workflow: `refreshToken` (public route)

```mermaid
sequenceDiagram
    participant Client
    participant Ctrl as refreshToken
    participant STS as Google Secure Token API

    Client->>Ctrl: POST /refresh-token + {refreshToken}
    Ctrl->>STS: POST securetoken.googleapis.com/v1/token
    alt invalid/expired
        STS-->>Ctrl: error
        Ctrl-->>Client: 401 Invalid refresh token
    else valid
        STS-->>Ctrl: {id_token, refresh_token, expires_in}
        Ctrl-->>Client: 200 new tokens
    end
```

Note: this bypasses `adminAuth` entirely — it talks directly to Firebase's public REST API since Admin SDK has no refresh-token exchange method.

---

## Workflow: `forgotPassword` → `resetPassword`

```mermaid
sequenceDiagram
    participant Client
    participant Forgot as forgotPassword
    participant Firebase as adminAuth
    participant Reset as resetPassword
    participant IDT as Identity Toolkit REST API
    participant Console as Server Console (placeholder)

    Client->>Forgot: POST /forgot-password + {email}
    Forgot->>Firebase: generatePasswordResetLink(email)
    Firebase-->>Forgot: resetLink (contains oobCode)
    Forgot->>Console: console.log(resetLink)
    Forgot-->>Client: 200 "Reset link sent" (generic message)

    Note over Client,Console: In production, resetLink should be emailed,<br/>not logged.

    Client->>Reset: POST /reset-password + {oobCode, newPassword}
    Reset->>IDT: accounts:resetPassword {oobCode, newPassword}
    alt invalid code
        IDT-->>Reset: error
        Reset-->>Client: 400 Invalid/expired code
    else success
        IDT-->>Reset: confirmation
        Reset-->>Client: 200 Password reset successful
    end
```

---

## Workflow: `verifyEmail` / `resendVerificationEmail`

```mermaid
sequenceDiagram
    participant Client
    participant Resend as resendVerificationEmail
    participant Firebase as adminAuth
    participant Verify as verifyEmail
    participant IDT as Identity Toolkit REST API
    participant DB as MongoDB

    Client->>Resend: POST /resend-verification + idToken
    Resend->>Firebase: generateEmailVerificationLink(email)
    Firebase-->>Resend: verificationLink (contains oobCode)
    Resend-->>Client: 200 "Verification email sent"

    Client->>Verify: POST /verify-email + {oobCode}
    Verify->>IDT: accounts:update {oobCode}
    alt invalid code
        IDT-->>Verify: error
        Verify-->>Client: 400 Invalid/expired code
    else success
        IDT-->>Verify: {email}
        Verify->>DB: findOneAndUpdate({email}, {isVerified: true})
        Verify-->>Client: 200 Email verified successfully
    end
```

---

## Workflow: `deleteAccount`

```mermaid
sequenceDiagram
    participant Client
    participant Ctrl as deleteAccount
    participant DB as MongoDB
    participant Firebase as adminAuth

    Client->>Ctrl: DELETE /delete-account + idToken
    Ctrl->>DB: findOneAndDelete({firebaseUID: uid})
    alt not found
        DB-->>Ctrl: null
        Ctrl-->>Client: 404 Profile not found
    else deleted
        DB-->>Ctrl: deleted user doc
        Ctrl->>Firebase: deleteUser(uid)
        Firebase-->>Ctrl: confirmation
        Ctrl-->>Client: 200 Account deleted successfully
    end
```

**Why Mongo is deleted first:** if Mongo deletion fails, nothing has happened to Firebase yet (safe to retry). If Firebase deletion failed after Mongo succeeded, you'd have an orphaned Firebase account — recoverable manually — rather than a broken app record pointing to nothing.

---

## Common Patterns Used Throughout

| Pattern | Purpose |
|---|---|
| `asyncHandler(async (req, res) => {...})` | Avoids repetitive try/catch; forwards errors to Express error handler |
| `throw new ApiError(code, message)` | Consistent error shape across the whole API |
| `new ApiResponse(code, data, message)` | Consistent success shape across the whole API |
| `req.firebaseUser` | Populated by `verifyFirebaseToken` middleware; contains decoded Firebase ID token claims (`uid`, `email`, `email_verified`, etc.) |
| Firebase REST calls (`fetch`) | Used only where Admin SDK has no equivalent (refresh token exchange, oobCode-based reset/verify) |

## Required Environment Variable To Add

`FIREBASE_API_KEY=your-firebase-web-api-key`


This is separate from `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` already used in `config/firebase.js` (those are Admin SDK service account creds; `FIREBASE_API_KEY` is the public Web API key used for the REST-based token/reset/verify calls).

## Still Needs Wiring (marked with TODO in code)

- An actual email-sending service (Nodemailer, Resend, SendGrid, etc.) to deliver the reset-password and email-verification links instead of `console.log`.