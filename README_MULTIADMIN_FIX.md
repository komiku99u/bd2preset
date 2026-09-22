# Multi-admin D1 — Fix

This update fixes legacy-admin migration: the existing ADMIN_USERNAME/ADMIN_PASSWORD account is migrated to D1 even if admin_users already contains another admin.

It also returns a clear error when the admin_users table has not been created yet.

## Required
Run schema.sql against the production D1 database `browndust2-presets` once.

Then deploy these files. Existing `admin.html` is unchanged.
