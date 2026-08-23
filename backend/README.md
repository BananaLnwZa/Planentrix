# Planentrix Backend

Express and TypeScript API for the Planentrix admin and user applications.

## Commands

```bash
npm run dev:user
npm run dev:admin
npm run typecheck
npm test
```

The user server uses `USER_SERVER_PORT` and defaults to port `4000`.

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
changes, workload score changes, and constraint changes. The user server checks
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
