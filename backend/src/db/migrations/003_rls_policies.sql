-- Migration 003: Row-Level Security (RLS) policies
-- Multi-tenant isolation: no institution can see another institution's data
-- Run after 002_triggers.sql

-- ============================================================
-- ENABLE RLS ON ALL TENANT-SCOPED TABLES
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: JWT claim extraction
-- The backend sets these claims when calling Supabase with the
-- user's JWT. The service-role key bypasses RLS for admin ops.
-- ============================================================
-- Current user's institution_id from JWT
CREATE OR REPLACE FUNCTION current_institution_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.institution_id', TRUE), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Current user's id from JWT
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Current user's role from JWT
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
    SELECT NULLIF(current_setting('app.user_role', TRUE), '');
$$ LANGUAGE sql STABLE;

-- ============================================================
-- POLICIES: USERS TABLE
-- ============================================================
-- Admins can see all users in their institution
CREATE POLICY "users_admin_select" ON users
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'admin'
    );

-- Teachers can see users in their institution
CREATE POLICY "users_teacher_select" ON users
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'teacher'
    );

-- Students can only see themselves
CREATE POLICY "users_student_select" ON users
    FOR SELECT USING (
        id = current_user_id()
        AND current_user_role() = 'student'
    );

-- Parents can see themselves + their verified linked children
CREATE POLICY "users_parent_select" ON users
    FOR SELECT USING (
        current_user_role() = 'parent'
        AND (
            id = current_user_id()
            OR id IN (
                SELECT student_user_id FROM parent_student_links
                WHERE parent_user_id = current_user_id()
                AND status = 'accepted'
            )
        )
    );

-- Users can update their own profile
CREATE POLICY "users_self_update" ON users
    FOR UPDATE USING (id = current_user_id());

-- ============================================================
-- POLICIES: TASKS TABLE
-- Students only CRUD their own tasks (spec requirement)
-- Parents read their linked children's tasks
-- Admins read all tasks in their institution
-- ============================================================
CREATE POLICY "tasks_student_all" ON tasks
    FOR ALL USING (
        institution_id = current_institution_id()
        AND student_user_id = current_user_id()
        AND current_user_role() = 'student'
    );

CREATE POLICY "tasks_parent_select" ON tasks
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'parent'
        AND student_user_id IN (
            SELECT student_user_id FROM parent_student_links
            WHERE parent_user_id = current_user_id()
            AND status = 'accepted'
        )
    );

CREATE POLICY "tasks_admin_select" ON tasks
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'admin'
    );

CREATE POLICY "tasks_teacher_select" ON tasks
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'teacher'
    );

-- ============================================================
-- POLICIES: ATTENDANCE RECORDS
-- Teachers only write attendance for subjects they teach (spec)
-- ============================================================
CREATE POLICY "attendance_teacher_all" ON attendance_records
    FOR ALL USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'teacher'
        AND subject_id IN (
            SELECT subject_id FROM teacher_subjects
            WHERE teacher_user_id = current_user_id()
        )
    );

CREATE POLICY "attendance_student_select" ON attendance_records
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND student_user_id = current_user_id()
        AND current_user_role() = 'student'
    );

CREATE POLICY "attendance_parent_select" ON attendance_records
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'parent'
        AND student_user_id IN (
            SELECT student_user_id FROM parent_student_links
            WHERE parent_user_id = current_user_id()
            AND status = 'accepted'
        )
    );

CREATE POLICY "attendance_admin_select" ON attendance_records
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'admin'
    );

-- ============================================================
-- POLICIES: NOTICES
-- ============================================================
CREATE POLICY "notices_read_all" ON notices
    FOR SELECT USING (institution_id = current_institution_id());

CREATE POLICY "notices_teacher_admin_write" ON notices
    FOR INSERT WITH CHECK (
        institution_id = current_institution_id()
        AND current_user_role() IN ('teacher', 'admin')
    );

CREATE POLICY "notices_author_update" ON notices
    FOR UPDATE USING (
        institution_id = current_institution_id()
        AND (author_user_id = current_user_id() OR current_user_role() = 'admin')
    );

-- ============================================================
-- POLICIES: NOTES (student owns their own notes)
-- ============================================================
CREATE POLICY "notes_student_all" ON notes
    FOR ALL USING (
        institution_id = current_institution_id()
        AND student_user_id = current_user_id()
        AND current_user_role() = 'student'
    );

-- ============================================================
-- POLICIES: IN-APP NOTIFICATIONS (users see only their own)
-- ============================================================
CREATE POLICY "in_app_notifications_own" ON in_app_notifications
    FOR ALL USING (
        institution_id = current_institution_id()
        AND user_id = current_user_id()
    );

-- ============================================================
-- POLICIES: PARENT-STUDENT LINKS
-- Parents can see their own links; students can see links to themselves
-- ============================================================
CREATE POLICY "parent_links_parent_all" ON parent_student_links
    FOR ALL USING (parent_user_id = current_user_id());

CREATE POLICY "parent_links_student_select" ON parent_student_links
    FOR SELECT USING (student_user_id = current_user_id());

-- ============================================================
-- POLICIES: SUBJECTS (institution-scoped, all roles read)
-- ============================================================
CREATE POLICY "subjects_institution_read" ON subjects
    FOR SELECT USING (institution_id = current_institution_id());

CREATE POLICY "subjects_admin_write" ON subjects
    FOR ALL USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'admin'
    );

-- ============================================================
-- POLICIES: AUDIT LOG (admin read-only)
-- ============================================================
CREATE POLICY "audit_log_admin_select" ON audit_log
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'admin'
    );

-- ============================================================
-- POLICIES: AUTOMATION LOGS (admin read-only)
-- ============================================================
CREATE POLICY "automation_logs_admin_select" ON automation_logs
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'admin'
    );

-- ============================================================
-- POLICIES: PLACEMENT APPLICATIONS (student owns their own)
-- ============================================================
CREATE POLICY "placement_student_all" ON placement_applications
    FOR ALL USING (
        institution_id = current_institution_id()
        AND student_user_id = current_user_id()
        AND current_user_role() = 'student'
    );

CREATE POLICY "placement_admin_select" ON placement_applications
    FOR SELECT USING (
        institution_id = current_institution_id()
        AND current_user_role() = 'admin'
    );

-- ============================================================
-- POLICIES: STUDY GROUPS (institution-scoped)
-- ============================================================
CREATE POLICY "study_groups_institution_read" ON study_groups
    FOR SELECT USING (institution_id = current_institution_id());

CREATE POLICY "study_groups_student_write" ON study_groups
    FOR INSERT WITH CHECK (
        institution_id = current_institution_id()
        AND current_user_role() = 'student'
    );

CREATE POLICY "study_groups_creator_update" ON study_groups
    FOR UPDATE USING (
        institution_id = current_institution_id()
        AND (created_by = current_user_id() OR current_user_role() = 'admin')
    );

CREATE POLICY "study_group_members_institution" ON study_group_members
    FOR ALL USING (
        group_id IN (
            SELECT id FROM study_groups
            WHERE institution_id = current_institution_id()
        )
    );

-- ============================================================
-- POLICIES: FLASHCARDS & CHAT (student owns their own)
-- ============================================================
CREATE POLICY "flashcards_student_all" ON flashcards
    FOR ALL USING (
        institution_id = current_institution_id()
        AND student_user_id = current_user_id()
        AND current_user_role() = 'student'
    );

CREATE POLICY "chat_student_all" ON study_chat_messages
    FOR ALL USING (
        institution_id = current_institution_id()
        AND student_user_id = current_user_id()
        AND current_user_role() = 'student'
    );
