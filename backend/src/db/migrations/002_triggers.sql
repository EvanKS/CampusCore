-- Migration 002: Triggers for audit log and updated_at maintenance
-- Run after 001_initial_schema.sql

-- ============================================================
-- updated_at TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at to all editable tables
CREATE TRIGGER trg_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_teacher_profiles_updated_at
    BEFORE UPDATE ON teacher_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_parent_profiles_updated_at
    BEFORE UPDATE ON parent_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_attendance_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notices_updated_at
    BEFORE UPDATE ON notices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_placement_updated_at
    BEFORE UPDATE ON placement_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_study_groups_updated_at
    BEFORE UPDATE ON study_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION write_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_institution_id UUID;
    v_record_id UUID;
    v_old_data JSONB;
    v_new_data JSONB;
    v_action audit_action;
BEGIN
    v_action := TG_OP::audit_action;

    IF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id;
        v_old_data := row_to_json(OLD)::JSONB;
        v_new_data := NULL;
        -- Try to get institution_id from old row
        BEGIN
            v_institution_id := OLD.institution_id;
        EXCEPTION WHEN undefined_column THEN
            v_institution_id := NULL;
        END;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id;
        v_old_data := NULL;
        v_new_data := row_to_json(NEW)::JSONB;
        BEGIN
            v_institution_id := NEW.institution_id;
        EXCEPTION WHEN undefined_column THEN
            v_institution_id := NULL;
        END;
    ELSE -- UPDATE
        v_record_id := NEW.id;
        v_old_data := row_to_json(OLD)::JSONB;
        v_new_data := row_to_json(NEW)::JSONB;
        BEGIN
            v_institution_id := NEW.institution_id;
        EXCEPTION WHEN undefined_column THEN
            v_institution_id := NULL;
        END;
    END IF;

    INSERT INTO audit_log (institution_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_institution_id, v_action, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to specified tables per spec
CREATE TRIGGER trg_tasks_audit
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER trg_attendance_audit
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER trg_notices_audit
    AFTER INSERT OR UPDATE OR DELETE ON notices
    FOR EACH ROW EXECUTE FUNCTION write_audit_log();

-- Role-change audit on users (per spec: audit users.role changes)
CREATE OR REPLACE FUNCTION audit_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO audit_log (institution_id, action, table_name, record_id, old_data, new_data)
        VALUES (
            NEW.institution_id,
            'UPDATE',
            'users',
            NEW.id,
            jsonb_build_object('role', OLD.role),
            jsonb_build_object('role', NEW.role)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_users_role_audit
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_user_role_change();
