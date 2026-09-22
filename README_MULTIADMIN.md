# Multi-admin D1 update

- Existing `admin.html` is intentionally unchanged.
- Existing Cloudflare secrets `ADMIN_USERNAME` and `ADMIN_PASSWORD` are used only once to migrate the current admin into D1 on the first successful login after deployment.
- `SESSION_SECRET` remains required for signed sessions.
- Admin accounts are stored in the D1 `admin_users` table with PBKDF2-SHA256 password hashes and per-user salts.
- Open `/admin-users.html` after logging in to add or remove admins.
- A current admin cannot delete their own account, and the last remaining admin cannot be deleted.

## D1 migration
Run the updated `schema.sql` against the existing `browndust2-presets` D1 database before deploying the code.
