# Planentrix Backend

Express and TypeScript API for the Planentrix admin and user applications.

## Commands

```bash
npm run dev
npm run typecheck
npm test
```

`src/server.ts` is the single Express server entry point for `/user/*`,
`/instructor/*`, and `/admin/*` routes. It uses
`PORT`, `SERVER_PORT`, or the legacy `USER_SERVER_PORT` setting and defaults to
port `4000`. The old `npm run dev:user` and `npm run dev:admin` commands remain
as aliases, but only one of these commands should be run at a time.

## Authentication and roles

Authentication is centralized under `src/auth` and mounted at `/auth`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a user account. |
| `POST` | `/auth/bootstrap-admin` | Register the first admin only; requires `x-bootstrap-secret` and stops working after an admin exists. |
| `POST` | `/auth/admin/register` | Register a `university_staff` or `instructor` account; requires a `university_staff` token. |
| `POST` | `/auth/login` | Log in from the shared login API and return a role-bearing JWT. |
| `POST` | `/auth/refresh-token` | Refresh a mobile user access token. |
| `POST` | `/auth/logout` | Log out the authenticated account. |
| `GET` | `/auth/me` | Get the current account profile. |
| `DELETE` | `/auth/me` | Delete the current user account. |

Authentication and JWT payloads use the database role names directly:
`user`, `instructor`, and `university_staff`. Protected route groups use
`verifyToken` followed by `requireRole` before their controllers run.

### First administrator

For local development, send
`POST http://localhost:4000/auth/bootstrap-admin` from the same computer with
`Content-Type: application/json`. No bootstrap secret is required for a
localhost request while `NODE_ENV` is not `production`. The body uses the normal
admin registration fields and `role` must be `university_staff`.

Production and non-local requests must set `ADMIN_BOOTSTRAP_SECRET` in `.env` to
a random value of at least 32 characters and send the same value in the
`x-bootstrap-secret` header.

The endpoint obtains a database lock and refuses the request with `409` after a
`university_staff` administrator exists. Create all subsequent administrators
through `/auth/admin/register` with an existing admin Bearer token.

## Weekly recommendation API

All routes require a user JWT in the `Authorization` header and are mounted at
`/user/recommendations`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/generate` | Generate a pending recommendation. Body may contain `trigger_type` and Monday `target_week_start`. |
| `GET` | `/latest?week_start=YYYY-MM-DD` | Get the latest non-superseded recommendation. |
| `GET` | `/schedule?week_start=YYYY-MM-DD` | Get recurring classes plus the accepted weekly plan. |
| `GET` | `/:recommendation_id` | Get recommendation items, reasons, changes, and preview blocks. |
| `POST` | `/:recommendation_id/accept` | Accept the complete collision-free plan. |
| `POST` | `/:recommendation_id/reject` | Reject a pending recommendation. |
| `POST` | `/:recommendation_id/blocks` | Add a user block to a pending or accepted weekly plan. |
| `PUT` | `/:recommendation_id/blocks/:weekly_block_id` | Move or resize a weekly block after constraint validation. |
| `DELETE` | `/:recommendation_id/blocks/:weekly_block_id` | Remove a weekly block and recalculate item totals. |

The backend also recalculates recommendations after exam submission, workload
changes, workload score changes, and constraint changes. The server checks
every minute on Sunday and creates the following week's recommendation once the
time in `Asia/Bangkok` reaches 18:00.

## Database migration

Run `migrations/20260824_add_weekly_schedule_recommendations.sql` against the
Planentrix MySQL database. It creates the three weekly recommendation tables and
is idempotent when those tables already exist.

Exam feedback maps subject types to review methods through the rules in
`src/user/services/review-method.rules.ts`. The rules use `reading` for theory,
`practice` for programming/database/AI/web, `review` for system design and
projects, and `video` for networking/security. An unmapped subject type falls
back to the `review` study type. Exam-part scores still independently decide weak
topics using the existing below-50-percent rule.
