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
| `PATCH` | `/auth/me/archive` | Archive the current user account without deleting its data; also revoke its refresh token. |

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
| `POST` | `/generate` | Generate a pending recommendation. Body may contain `trigger_type`, Monday `target_week_start`, `source_exam_attempt_id`, and `workload_id`. |
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

Only the Sunday `weekend` run uses reading behavior from `study_sessions`.
For each enrollment it records the previous week's actual minutes, minutes that
overlap the accepted review plan, completion rate, and adherence percentage.
Behavior never adds to the review target: it chooses whether to preserve the
previous plan or prefer the user's actual reading days/start time, and uses the
typical completed-session duration to split or merge blocks. Completing a timer
session does not generate a recommendation.

Review has no unconditional base time. A normal week therefore has no review
block when score-gap, weak-topic, and behavior rules all produce zero minutes.
During the week immediately before or overlapping a midterm/final period, the
exam rule raises the calculated review target to a minimum of 60 minutes; it
does not add another hour when the target is already at least 60 minutes.

Schedule and workload categories are resolved by `type_code`, not fixed numeric
IDs. The required active codes are `review` and `homework` in `schedule_types`,
and `assignment` and `project` in `workload_types`. Classes remain in
`class_meetings` and are not a schedule type.

## Database migration

Import the current Planentrix baseline schema, then run every SQL file in
`migrations/` in filename order. The migration set now targets the current
`academic_terms`, `student_terms`, `enrollments`, and `study_sessions` model;
legacy migrations are retained as safe no-ops. See `migrations/README.md` for
the table mapping and execution notes.
