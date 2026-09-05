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

## 1. `registerUser`

**Route:** `POST /register` (protected by `verifyFirebaseToken`)

- Runs **after** the client has already created a Firebase account and signed in — the frontend sends the Firebase ID token, which `verifyFirebaseToken` middleware decodes into `req.firebaseUser`.
- Pulls `uid` and `email` from the decoded Firebase token, and `userName` / `fullName` from the request body.
- Validates that `userName` and `fullName` were provided.
- Checks Mongo to make sure this Firebase UID hasn't already been registered (prevents duplicate profiles).
- Creates the Mongo `User` document, copying `email_verified` from the Firebase token into `isVerified`.
- Responds `201 Created` with the new user.

---

## 2. `getCurrentUser`

**Route:** `GET /me` (protected)

- Looks up the Mongo profile matching the currently authenticated Firebase UID.
- If no profile exists, throws a `404` (this can happen if someone has a valid Firebase account but never completed `/register`).
- Returns the profile with `200 OK`.

---

## 3. `loginUser`

**Route:** `POST /login` (protected)

Firebase itself already verifies the password on the frontend — this endpoint's job is just to **sync app-side state** after that login succeeds.

- Extracts `uid` and `email_verified` from the decoded token.
- Fetches the matching Mongo profile. If it doesn't exist, throws `404` (user must register first).
- If Mongo's `isVerified` is out of sync with Firebase's `email_verified`, updates and saves it — this keeps your DB accurate if the user verified their email after registering.
- Returns the profile with `200 OK`.

---

## 4. `logoutUser`

**Route:** `POST /logout` (protected)

- Calls `adminAuth.revokeRefreshTokens(uid)`.
- This invalidates all existing Firebase refresh tokens for that user, meaning any ID token minted after this point using an old refresh token will fail — effectively force-logging-out the user everywhere.
- Note: it does **not** invalidate the current ID token immediately (those are valid until they naturally expire, usually within 1 hour), which is a normal limitation of Firebase.

---

## 5. `refreshToken`

**Route:** `POST /refresh-token` (public — no middleware, since the old ID token is likely expired)

- Firebase Admin SDK **cannot** mint new ID tokens from a refresh token — that only works through Firebase's public **Secure Token API**.
- Takes `refreshToken` from the request body.
- Sends a `POST` request to `https://securetoken.googleapis.com/v1/token?key=<FIREBASE_API_KEY>` with `grant_type: refresh_token`.
- If Firebase rejects it, throws `401`.
- On success, returns the new `idToken`, `refreshToken`, and `expiresIn` to the client.

> ⚠️ Requires a `FIREBASE_API_KEY` env variable — this is your Firebase **Web API key** (found in Firebase Console → Project Settings → General), **not** the Admin SDK service account credentials already used in `config/firebase.js`.

---

## 6. `updateProfile`

**Route:** `PATCH /update-profile` (protected)

- Accepts optional `userName` and/or `fullName` in the body.
- Throws `400` if neither is provided (nothing to update).
- Builds a partial `$set` update object with only the provided fields.
- Uses `findOneAndUpdate` with `{ new: true, runValidators: true }` so the response contains the updated doc and Mongoose schema validation still runs.
- Throws `404` if the profile isn't found.

---

## 7. `changePassword`

**Route:** `PATCH /change-password` (protected)

- Accepts `newPassword` from the body, validates a minimum length of 6 characters (Firebase's own minimum).
- Calls `adminAuth.updateUser(uid, { password: newPassword })` to set the new password directly via Admin SDK.
- **Important:** Admin SDK can't verify the *current* password — there's no "verify old password" step here. In production, the frontend should force the user to **reauthenticate** with Firebase (re-enter old password) right before calling this endpoint, so the ID token used to authorize this request is fresh.

---

## 8. `forgotPassword`

**Route:** `POST /forgot-password` (public)

- Accepts an `email` in the body.
- Calls `adminAuth.generatePasswordResetLink(email)`, which returns a Firebase-hosted reset link (with an embedded `oobCode`).
- Currently just `console.log`s the link — **this is a placeholder**. In a real app you'd email this link to the user via a service like Nodemailer, SendGrid, etc.
- Always responds `200 OK` with a generic message (avoid confirming/denying whether an email exists, to prevent user enumeration).

---

## 9. `resetPassword`

**Route:** `POST /reset-password` (public)

- Accepts `oobCode` (the code embedded in the reset link the user clicked) and `newPassword`.
- Calls Firebase's `accounts:resetPassword` REST endpoint (`identitytoolkit.googleapis.com`) with the code and new password.
- Firebase validates the code server-side; if invalid/expired, responds with an error which is forwarded as `400`.
- On success, the user's Firebase password is updated.

> ⚠️ Also requires `FIREBASE_API_KEY`.

---

## 10. `verifyEmail`

**Route:** `POST /verify-email` (public)

- Accepts `oobCode` (from the verification link Firebase emailed/generated).
- Calls the `accounts:update` REST endpoint with the code — Firebase confirms the email associated with that code.
- On success, Firebase returns the associated `email` in its response.
- Updates the matching Mongo user's `isVerified` field to `true`, keeping the DB in sync with Firebase's verification state.

> ⚠️ Also requires `FIREBASE_API_KEY`.

---

## 11. `resendVerificationEmail`

**Route:** `POST /resend-verification` (protected)

- Gets `email` from the authenticated user's decoded token.
- Calls `adminAuth.generateEmailVerificationLink(email)` to get a fresh verification link.
- Same placeholder pattern as `forgotPassword` — currently just logs the link; needs a real email service wired in.

---

## 12. `deleteAccount`

**Route:** `DELETE /delete-account` (protected)

- Deletes the Mongo profile first (`findOneAndDelete`), throwing `404` if it doesn't exist.
- Then deletes the actual Firebase user via `adminAuth.deleteUser(uid)`.
- **Order matters here:** deleting Mongo first, then Firebase, avoids leaving an orphaned Firebase account if the Mongo deletion were to fail — you'd rather have a "ghost" Firebase user (recoverable) than a Firebase-less Mongo record pointing nowhere.

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