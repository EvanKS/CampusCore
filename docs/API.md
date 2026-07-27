# CampusFlow — API Reference

> Base URL (local): `http://localhost:4000/api`  
> Base URL (production): set in `NEXT_PUBLIC_API_URL`

All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Auth (`/api/auth`)

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | ❌ | `{email, password, fullName, role, institutionSlug, phone?}` | Create account |
| POST | `/auth/login` | ❌ | `{email, password}` | Login → `{accessToken, refreshToken, user}` |
| POST | `/auth/refresh` | ❌ | `{refreshToken}` | Rotate tokens |
| POST | `/auth/google` | ❌ | `{idToken, role?, institutionSlug?}` | Google OAuth login |
| POST | `/auth/logout` | ✅ | `{refreshToken}` | Revoke refresh token |
| GET | `/auth/me` | ✅ | — | Current user profile |
| POST | `/auth/change-password` | ✅ | `{currentPassword, newPassword}` | Change password |

---

## Users (`/api/users`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/users/profile` | All | Get own profile |
| PATCH | `/users/profile` | All | Update own profile (`fullName`, `phone`, `themePreference`, `notificationPrefs`) |
| GET | `/users` | admin, teacher | List users (admin: all; teacher: students only). Query: `role`, `search`, `page`, `limit` |
| PATCH | `/users/:id` | admin | Deactivate/reactivate a user |
| POST | `/users/onboarding/student` | student | Set branch, year, subject enrolments |
| POST | `/users/onboarding/teacher` | teacher | Set department, subject assignments |
| POST | `/users/onboarding/parent` | parent | Verify invite code to link to student |
| POST | `/users/invite-parent` | student | Generate invite code for a parent |

---

## Tasks (`/api/tasks`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/tasks` | student | List own tasks. Query: `status`, `priority`, `limit`, `page` |
| POST | `/tasks` | student | Create task → fires n8n webhook + fallback (WhatsApp + Calendar) |
| PATCH | `/tasks/:id` | student | Update own task |
| DELETE | `/tasks/:id` | student | Delete own task |

**POST /tasks body:**
```json
{
  "title": "Submit assignment",
  "description": "Optional",
  "deadlineAt": "2025-08-01T23:59:00Z",
  "priority": "high",
  "subjectId": "uuid-optional"
}
```

---

## Attendance (`/api/attendance`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/attendance` | teacher | Mark attendance for a subject date |
| GET | `/attendance` | all | Get records (filtered by role) |
| GET | `/attendance/summary` | student, parent, admin | Attendance % per subject |
| GET | `/attendance/overview` | teacher | All student attendance across teacher's subjects |
| PATCH | `/attendance/:id` | teacher | Correct a record |

---

## Notices (`/api/notices`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/notices` | all | List notices relevant to user's role |
| POST | `/notices` | teacher, admin | Create notice → AI summary → WhatsApp broadcast |
| PATCH | `/notices/:id` | teacher, admin | Update notice |
| DELETE | `/notices/:id` | teacher, admin | Delete notice |

---

## AI (`/api/ai`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/ai/chat` | student | Study-buddy chat. Body: `{sessionId, message}` |
| GET | `/ai/notes` | student | List own notes |
| POST | `/ai/notes` | student | Create note. Body: `{title, content, subjectId?}` |
| DELETE | `/ai/notes/:id` | student | Delete note |
| GET | `/ai/flashcards` | student | List flashcards |
| POST | `/ai/flashcards` | student | Generate flashcards from note. Body: `{noteId}` |

---

## Notifications (`/api/notifications`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/notifications` | all | In-app notifications. Query: `unreadOnly`, `page`, `limit` |
| PATCH | `/notifications/:id/read` | all | Mark one as read |
| PATCH | `/notifications/read-all` | all | Mark all as read |
| GET | `/notifications/preferences` | all | Get notification channel preferences |
| PATCH | `/notifications/preferences` | all | Update preferences `{email?, whatsapp?, in_app?}` |

---

## Placement (`/api/placement`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/placement` | student, admin | List applications |
| POST | `/placement` | student | Track new application |
| PATCH | `/placement/:id` | student | Update status/notes |
| DELETE | `/placement/:id` | student | Remove application |

---

## Study Groups (`/api/study-groups`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/study-groups` | all | List all groups in institution |
| GET | `/study-groups/:id` | all | Group detail + members |
| POST | `/study-groups` | student | Create group |
| POST | `/study-groups/:id/join` | all | Join group |
| DELETE | `/study-groups/:id/leave` | all | Leave group |

---

## Admin (`/api/admin`)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/admin/analytics` | admin | Institution-wide stats |
| GET | `/admin/audit-log` | admin | Audit log. Query: `table`, `page`, `limit` |
| GET | `/admin/automation-logs` | admin | n8n execution health log |
| POST | `/admin/import-users` | admin | Bulk CSV user import (`multipart/form-data`, field: `file`) |
| POST | `/admin/subjects` | admin | Create subject |
| GET | `/admin/institution` | admin | Get institution settings |
| PATCH | `/admin/institution` | admin | Update name, attendance threshold |

---

## Webhooks (`/api/webhooks`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/webhooks/n8n/deadline-reminder` | Webhook secret | n8n triggers this when a reminder fires |
| POST | `/webhooks/n8n/notice-broadcast` | Webhook secret | n8n triggers this on notice broadcast |

---

## Error Responses

All errors follow this shape:
```json
{
  "error": "Human-readable error message",
  "details": [...]  // Optional: Zod validation errors
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Missing or expired token |
| 403 | Insufficient role |
| 404 | Resource not found |
| 409 | Conflict (e.g. email taken, group full) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
