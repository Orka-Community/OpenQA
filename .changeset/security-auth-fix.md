---
"@openqa/cli": patch
---

**SECURITY FIX**: Enable authentication by default on dashboard

Fixed critical security vulnerability where the dashboard, kanban, and config pages were accessible without authentication in `server.ts`. All HTML pages and API endpoints now require authentication by default.

**Breaking change for development**: If you were relying on unauthenticated access, you must now either:
1. Create an admin account on first launch at `/setup`
2. Set `OPENQA_AUTH_DISABLED=true` in your environment (NOT recommended for production)

**What changed**:
- Added authentication middleware to `server.ts` (was only in `daemon.ts`)
- All `/`, `/kanban`, `/config` routes now require login
- All `/api/*` routes (except `/api/auth/*`, `/api/setup`, `/api/health`) require JWT token
- Added rate limiting on auth endpoints (30 req/min)
- Added CORS configuration with credentials support

**Security features**:
- JWT-based authentication with httpOnly cookies
- Scrypt password hashing
- Role-based access control (admin/viewer)
- CSRF protection via SameSite cookies
- Rate limiting on mutation endpoints

**UX improvements**:
- Username validation now accepts email addresses (supports `._@-` characters)
- Better error messages and hints in setup form
