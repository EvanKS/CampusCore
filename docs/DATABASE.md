# CampusFlow — Database Schema

> PostgreSQL 15 on Supabase · Multi-tenant with Row-Level Security

## Quick Reference

| Table | Description |
|---|---|
| `institutions` | One row per tenant (college/university) |
| `users` | All users across all tenants; role: student/teacher/parent/admin |
| `student_profiles` | Extended profile for students (branch, year) |
| `teacher_profiles` | Extended profile for teachers (department) |
| `parent_profiles` | Parent extended profile |
| `parent_student_links` | Verified invite-code link between parent and student |
| `subjects` | Courses/subjects per institution |
| `student_subjects` | Student enrolments in subjects |
| `teacher_subjects` | Teacher assignments to subjects |
| `tasks` | Student tasks/deadlines with reminders |
| `attendance_records` | Per-student, per-subject, per-day attendance |
| `attendance_risk_alerts` | Idempotent log of WhatsApp alerts sent |
| `notices` | Notices from teachers/admins; AI-summarized |
| `study_groups` | Student-created study groups |
| `study_group_members` | Group membership |
| `placement_applications` | Student job application tracker |
| `in_app_notifications` | In-app notification inbox |
| `notification_logs` | Idempotent log of external notifications (WhatsApp/email) |
| `automation_logs` | n8n execution health log |
| `refresh_tokens` | Hashed JWT refresh tokens |
| `audit_log` | Trigger-populated log of all data changes |

## Key Design Decisions

### Multi-Tenancy
Every tenant-scoped table carries `institution_id` (UUID, FK to `institutions`). Postgres RLS enforces that queries from one institution cannot read another's data under any circumstance.

### Role-Level Security (Postgres RLS Policies)
See `migrations/003_rls_policies.sql` for the full set. Key policies:

- **Students**: INSERT/UPDATE/DELETE own tasks only; SELECT own attendance only
- **Teachers**: INSERT/UPDATE attendance for subjects they teach only; no access to other teachers' records
- **Parents**: SELECT only — and only for students they are explicitly linked to via a verified invite code
- **Admins**: Full access within their own `institution_id`; no cross-tenant access

### Audit Log (Triggers)
`migrations/002_triggers.sql` installs triggers on:
- `tasks` (INSERT, UPDATE, DELETE)
- `attendance_records` (INSERT, UPDATE, DELETE)
- `notices` (INSERT, UPDATE, DELETE)
- `users.role` (UPDATE only)

Each trigger appends a row to `audit_log` with: actor_user_id, action (INSERT/UPDATE/DELETE), table_name, row_id, old_data (JSONB), new_data (JSONB), institution_id, created_at.

### Idempotency
- `notification_logs`: unique constraint on `(user_id, channel, related_entity_id)` prevents double-sending
- `attendance_records`: unique constraint on `(subject_id, student_user_id, date)` with ON CONFLICT UPDATE
- BullMQ jobs: `jobId: \`task-${taskId}\`` ensures a task is only queued once

### Indexes
- All foreign keys indexed
- Composite: `(student_user_id, deadline_at)` on tasks
- Composite: `(subject_id, date)` on attendance_records
- Composite: `(institution_id, target_scope)` on notices

## Running Migrations

```bash
cd backend
npm run migrate
# Applies all files in src/db/migrations/ in order
```

## Seeding Demo Data

```bash
cd backend
npm run seed
# Creates 1 demo institution with students/teachers/parents/tasks/notices
```

## Connection

CampusFlow uses Supabase's connection pooler (PgBouncer) in transaction mode:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

`DIRECT_URL` is used for migrations (pgBouncer doesn't support prepared statements needed by some migration tools).
