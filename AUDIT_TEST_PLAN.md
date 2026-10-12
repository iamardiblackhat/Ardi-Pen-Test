# **AUDIT TEST PLAN & QA PROCEDURES**

## **1. Automated Test Suite**

**File:** `artifacts/api-server/src/routes/auth.test.ts`

**Coverage:**
- Password hashing & verification (`hashPassword`, `verifyPassword`)
- JWT session signing & verification (`signToken`, `verifyToken`)
- Cookie extraction hierarchy (`extractToken` prioritizing `req.cookies.ardi_auth` over `Authorization` header)
- Rejection of invalid/expired session tokens

To run typecheck & test validation:
```bash
pnpm run typecheck
```

---

## **2. Manual QA Verification Flows**

### **Flow 1: Registration & Cookie Issuance**
1. Open frontend app at `http://localhost:3000/register`.
2. Enter Name, Email, Organization, and Password.
3. Submit form.
4. **Expected Result:**
   - Account is created (201 Created).
   - Server sets `ardi_auth` HttpOnly cookie (`HttpOnly; SameSite=Lax; Path=/`).
   - Client redirects to `/onboarding` or `/dashboard`.
   - `localStorage` does **not** contain any JWT token.

### **Flow 2: Login & Session State**
1. Navigate to `http://localhost:3000/login`.
2. Enter registered credentials.
3. Click "Sign In".
4. **Expected Result:**
   - 200 OK response.
   - `ardi_auth` HttpOnly cookie is updated.
   - Session state is saved in `sessionStorage` (`ardi_logged_in: true`).
   - User is redirected to `/dashboard`.

### **Flow 3: Session Persistence Across Reloads**
1. Open active session on `/dashboard`.
2. Reload page (F5 / Refresh).
3. **Expected Result:**
   - `ProtectedRoute` issues `GET /api/auth/me` with `credentials: 'include'`.
   - Browser automatically includes `ardi_auth` cookie.
   - Server returns user profile (200 OK).
   - Page remains loaded without redirecting to `/login`.

### **Flow 4: Sign Out / Logout**
1. Navigate to Settings page (`/settings`).
2. Click "Sign Out".
3. **Expected Result:**
   - Client sends `DELETE /api/auth/logout` with `credentials: 'include'`.
   - Server clears `ardi_auth` cookie (`Max-Age=0`).
   - Session storage is cleared.
   - User is redirected to `/login`.
   - Subsequent navigation to `/dashboard` redirects back to `/login`.

### **Flow 5: Token Expiration & Unauthorized Handling**
1. Send request to protected endpoint without `ardi_auth` cookie or with expired cookie.
2. **Expected Result:**
   - Server responds with HTTP 401 (`{ "error": "Authentication required." }`).
   - Frontend `ProtectedRoute` catches 401 error, clears session state, and redirects to `/login`.
