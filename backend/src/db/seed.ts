/**
 * Seed Script — Demo Institution
 * Creates 1 demo institution with realistic students, teachers, parents,
 * tasks, notices, and attendance records.
 *
 * Usage: npm run seed
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();
import { pool } from './pool';
import { logger } from '../utils/logger';

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Seeding demo institution...');

    // ============================================================
    // Institution
    // ============================================================
    const { rows: [institution] } = await client.query(`
      INSERT INTO institutions (name, slug, domain, attendance_threshold)
      VALUES ('Demo University', 'demo-university', 'demo-university.edu', 75)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const instId = institution.id;
    logger.info(`Institution ID: ${instId}`);

    // ============================================================
    // Admin
    // ============================================================
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const { rows: [admin] } = await client.query(`
      INSERT INTO users (institution_id, email, password_hash, role, full_name, email_verified)
      VALUES ($1, 'admin@demo-university.edu', $2, 'admin', 'Dr. Admin Singh', TRUE)
      ON CONFLICT (email) DO UPDATE SET institution_id = EXCLUDED.institution_id
      RETURNING id
    `, [instId, adminHash]);

    // ============================================================
    // Teachers
    // ============================================================
    const teacherHash = await bcrypt.hash('Teacher@123', 12);
    const teacherData = [
      { email: 'priya.sharma@demo-university.edu', name: 'Prof. Priya Sharma', dept: 'Computer Science' },
      { email: 'arjun.mehta@demo-university.edu', name: 'Prof. Arjun Mehta', dept: 'Mathematics' },
    ];

    const teacherIds: string[] = [];
    for (const t of teacherData) {
      const { rows: [teacher] } = await client.query(`
        INSERT INTO users (institution_id, email, password_hash, role, full_name, email_verified, phone)
        VALUES ($1, $2, $3, 'teacher', $4, TRUE, '+919876543210')
        ON CONFLICT (email) DO UPDATE SET institution_id = EXCLUDED.institution_id
        RETURNING id
      `, [instId, t.email, teacherHash, t.name]);
      teacherIds.push(teacher.id);

      await client.query(`
        INSERT INTO teacher_profiles (user_id, department, employee_id)
        VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
      `, [teacher.id, t.dept, `EMP${Math.floor(Math.random() * 9000 + 1000)}`]);
    }

    // ============================================================
    // Students
    // ============================================================
    const studentHash = await bcrypt.hash('Student@123', 12);
    const studentData = [
      { email: 'rahul.verma@demo-university.edu', name: 'Rahul Verma', branch: 'CSE', year: 3, phone: '+919876543211' },
      { email: 'sneha.patel@demo-university.edu', name: 'Sneha Patel', branch: 'CSE', year: 3, phone: '+919876543212' },
      { email: 'aditya.kumar@demo-university.edu', name: 'Aditya Kumar', branch: 'CSE', year: 2, phone: '+919876543213' },
      { email: 'kavya.reddy@demo-university.edu', name: 'Kavya Reddy', branch: 'ECE', year: 3, phone: '+919876543214' },
    ];

    const studentIds: string[] = [];
    for (const s of studentData) {
      const { rows: [student] } = await client.query(`
        INSERT INTO users (institution_id, email, password_hash, role, full_name, email_verified, phone)
        VALUES ($1, $2, $3, 'student', $4, TRUE, $5)
        ON CONFLICT (email) DO UPDATE SET institution_id = EXCLUDED.institution_id
        RETURNING id
      `, [instId, s.email, studentHash, s.name, s.phone]);
      studentIds.push(student.id);

      await client.query(`
        INSERT INTO student_profiles (user_id, branch, year, roll_number)
        VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING
      `, [student.id, s.branch, s.year, `2024${s.branch}${String(studentIds.length).padStart(3, '0')}`]);
    }

    // ============================================================
    // Parent
    // ============================================================
    const parentHash = await bcrypt.hash('Parent@123', 12);
    const { rows: [parent] } = await client.query(`
      INSERT INTO users (institution_id, email, password_hash, role, full_name, email_verified, phone)
      VALUES ($1, 'parent@demo-university.edu', $2, 'parent', 'Mr. Suresh Verma', TRUE, '+919876543215')
      ON CONFLICT (email) DO UPDATE SET institution_id = EXCLUDED.institution_id
      RETURNING id
    `, [instId, parentHash]);

    await client.query(`
      INSERT INTO parent_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING
    `, [parent.id]);

    // Link parent to first student
    await client.query(`
      INSERT INTO parent_student_links (parent_user_id, student_user_id, invite_code, status, verified_at)
      VALUES ($1, $2, 'DEMO123', 'accepted', NOW())
      ON CONFLICT DO NOTHING
    `, [parent.id, studentIds[0]]);

    // ============================================================
    // Subjects
    // ============================================================
    const subjectData = [
      { name: 'Data Structures & Algorithms', code: 'CS301', branch: 'CSE', year: 3, credits: 4 },
      { name: 'Operating Systems', code: 'CS302', branch: 'CSE', year: 3, credits: 4 },
      { name: 'Linear Algebra', code: 'MA201', branch: 'CSE', year: 2, credits: 3 },
      { name: 'Digital Electronics', code: 'EC301', branch: 'ECE', year: 3, credits: 4 },
    ];

    const subjectIds: string[] = [];
    for (const s of subjectData) {
      const { rows: [subject] } = await client.query(`
        INSERT INTO subjects (institution_id, name, code, branch, year, credits)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [instId, s.name, s.code, s.branch, s.year, s.credits]);
      subjectIds.push(subject.id);
    }

    // Assign teachers to subjects
    await client.query(`
      INSERT INTO teacher_subjects (teacher_user_id, subject_id, institution_id, academic_year)
      VALUES ($1, $2, $3, '2024-25'), ($1, $4, $3, '2024-25')
      ON CONFLICT DO NOTHING
    `, [teacherIds[0], subjectIds[0], instId, subjectIds[1]]);

    await client.query(`
      INSERT INTO teacher_subjects (teacher_user_id, subject_id, institution_id, academic_year)
      VALUES ($1, $2, $3, '2024-25')
      ON CONFLICT DO NOTHING
    `, [teacherIds[1], subjectIds[2], instId]);

    // Enroll students in subjects
    for (const studentId of studentIds.slice(0, 3)) {
      for (const subjectId of subjectIds.slice(0, 2)) {
        await client.query(`
          INSERT INTO student_subjects (student_user_id, subject_id, institution_id, academic_year)
          VALUES ($1, $2, $3, '2024-25') ON CONFLICT DO NOTHING
        `, [studentId, subjectId, instId]);
      }
    }

    // ============================================================
    // Tasks
    // ============================================================
    const tasks = [
      { title: 'Complete DSA Assignment 3', desc: 'Implement Red-Black Tree with all operations', priority: 'high', status: 'pending', daysFromNow: 3 },
      { title: 'OS Lab Report - Process Scheduling', desc: 'Document Round Robin and Priority scheduling experiments', priority: 'medium', status: 'in_progress', daysFromNow: 5 },
      { title: 'Mini Project Proposal', desc: 'Submit 2-page proposal for final year project', priority: 'urgent', status: 'pending', daysFromNow: 1 },
      { title: 'Linear Algebra Quiz Prep', desc: 'Revise eigenvalues, eigenvectors, and matrix decomposition', priority: 'medium', status: 'pending', daysFromNow: 2 },
    ];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const deadline = new Date(Date.now() + t.daysFromNow * 24 * 60 * 60 * 1000);
      await client.query(`
        INSERT INTO tasks (institution_id, student_user_id, subject_id, title, description, status, priority, deadline_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [instId, studentIds[i % studentIds.length], subjectIds[i % subjectIds.length],
          t.title, t.desc, t.status, t.priority, deadline.toISOString()]);
    }

    // ============================================================
    // Attendance Records (last 10 days)
    // ============================================================
    for (let day = 9; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const studentId of studentIds.slice(0, 3)) {
        // Simulate one student with low attendance
        const isAbsent = studentId === studentIds[2] && day % 3 === 0;
        await client.query(`
          INSERT INTO attendance_records
            (institution_id, subject_id, student_user_id, teacher_user_id, date, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (subject_id, student_user_id, date) DO NOTHING
        `, [instId, subjectIds[0], studentId, teacherIds[0], dateStr, isAbsent ? 'absent' : 'present']);
      }
    }

    // ============================================================
    // Notices
    // ============================================================
    const notices = [
      {
        title: 'Mid-Semester Examination Schedule',
        body: 'The mid-semester examinations for the odd semester 2024-25 will be conducted from October 15-25, 2024. Students must carry their hall tickets. No electronic devices allowed in the examination hall. Results will be declared within 7 working days.',
        summary: '• Mid-sem exams: Oct 15-25, 2024\n• Carry hall tickets; no electronics\n• Results within 7 working days',
        scope: 'students',
      },
      {
        title: 'Annual Technical Fest - TechNova 2024',
        body: 'CampusFlow Demo University proudly presents TechNova 2024, our annual technical festival. Events include coding competitions, hackathons, robotics competitions, and technical paper presentations. Registration closes October 10th. Prize pool: ₹5,00,000.',
        summary: '• TechNova 2024 tech fest announced\n• Events: coding, hackathon, robotics, papers\n• Registration by Oct 10; prize pool ₹5L',
        scope: 'all',
      },
      {
        title: 'Library Extended Hours During Exam Season',
        body: 'The central library will remain open 24/7 from October 10 to October 30 to support students during examination preparation. Additional reading rooms have been made available. Please maintain silence and follow library rules.',
        summary: '• Library open 24/7: Oct 10-30\n• Extra reading rooms available\n• Maintain silence; follow library rules',
        scope: 'students',
      },
    ];

    for (const notice of notices) {
      const daysAgo = Math.floor(Math.random() * 7);
      const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      await client.query(`
        INSERT INTO notices
          (institution_id, author_user_id, title, body, ai_summary, target_scope, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [instId, admin.id, notice.title, notice.body, notice.summary, notice.scope, publishedAt]);
    }

    // ============================================================
    // Placement Applications (for first student)
    // ============================================================
    const placements = [
      { company: 'TCS', role: 'Software Engineer', status: 'interview', applied: '2024-09-01', next: 'Technical Interview Round 2' },
      { company: 'Infosys', role: 'Systems Engineer', status: 'offer', applied: '2024-08-15', next: 'Offer letter received' },
      { company: 'Google India', role: 'Software Engineer Intern', status: 'screening', applied: '2024-09-10', next: 'Online assessment pending' },
    ];

    for (const p of placements) {
      await client.query(`
        INSERT INTO placement_applications
          (institution_id, student_user_id, company_name, role, status, applied_at, next_step)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [instId, studentIds[0], p.company, p.role, p.status, p.applied, p.next]);
    }

    // ============================================================
    // Study Group
    // ============================================================
    const { rows: [group] } = await client.query(`
      INSERT INTO study_groups (institution_id, subject_id, name, description, created_by, max_members)
      VALUES ($1, $2, 'DSA Study Circle', 'Weekly study sessions for DSA preparation and problem solving', $3, 8)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [instId, subjectIds[0], studentIds[0]]);

    if (group) {
      for (const studentId of studentIds.slice(0, 3)) {
        await client.query(`
          INSERT INTO study_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [group.id, studentId]);
      }
    }

    await client.query('COMMIT');

    logger.info('✅ Seed completed successfully!');
    logger.info('');
    logger.info('Demo credentials:');
    logger.info('  Admin:    admin@demo-university.edu / Admin@123');
    logger.info('  Teacher:  priya.sharma@demo-university.edu / Teacher@123');
    logger.info('  Student:  rahul.verma@demo-university.edu / Student@123');
    logger.info('  Parent:   parent@demo-university.edu / Parent@123');
    logger.info('');
    logger.info('Institution slug: demo-university');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  logger.error('Seed runner failed:', err);
  process.exit(1);
});
