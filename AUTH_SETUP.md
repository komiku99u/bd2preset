# Brown Dust 2 Preset — Custom Admin Login

## Required Cloudflare Secrets

Create these in Workers & Pages > bd2preset > Settings > Variables and Secrets:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Use Secret/Encrypt for all three.

## Routes

- `/` — public
- `/admin.html` — requires custom login
- `/login.html` — login page
- `GET /api/presets` — public read
- `POST/PUT/DELETE /api/presets...` — requires admin session

The password is never placed in the HTML or JavaScript. The session is an HttpOnly, Secure, SameSite=Strict cookie signed with HMAC-SHA256.

After changing Functions files, redeploy the Pages project.
