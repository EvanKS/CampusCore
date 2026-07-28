/**
 * Demo Data — All mock API responses for running without a backend.
 * Used when the user is in demo mode (no real DB connection).
 */

export const DEMO_INSTITUTION_ID = 'demo-institution-1';
export const DEMO_STUDENT_ID = 'demo-student-1';
export const DEMO_TEACHER_ID = 'demo-teacher-1';
export const DEMO_PARENT_ID = 'demo-parent-1';
export const DEMO_ADMIN_ID = 'demo-admin-1';

// ============================================================
// Tasks
// ============================================================
export const DEMO_TASKS = [
  {
    id: 'task-1',
    title: 'Complete DSA Assignment 3',
    description: 'Implement Red-Black Tree with all operations',
    status: 'pending',
    priority: 'urgent',
    deadline_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    subject_id: 'sub-1',
    subject_name: 'Data Structures & Algorithms',
    student_user_id: DEMO_STUDENT_ID,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-2',
    title: 'OS Lab Report - Process Scheduling',
    description: 'Document Round Robin and Priority scheduling experiments',
    status: 'in_progress',
    priority: 'medium',
    deadline_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    subject_id: 'sub-2',
    subject_name: 'Operating Systems',
    student_user_id: DEMO_STUDENT_ID,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-3',
    title: 'Mini Project Proposal',
    description: 'Submit 2-page proposal for final year project',
    status: 'pending',
    priority: 'high',
    deadline_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    subject_id: 'sub-1',
    subject_name: 'Data Structures & Algorithms',
    student_user_id: DEMO_STUDENT_ID,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-4',
    title: 'Linear Algebra Quiz Prep',
    description: 'Revise eigenvalues, eigenvectors, and matrix decomposition',
    status: 'completed',
    priority: 'medium',
    deadline_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    subject_id: 'sub-3',
    subject_name: 'Linear Algebra',
    student_user_id: DEMO_STUDENT_ID,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// Attendance
// ============================================================
export const DEMO_ATTENDANCE_SUMMARY = [
  { subject_id: 'sub-1', subject_name: 'Data Structures & Algorithms', attended: 18, total: 22, percentage: 81.8 },
  { subject_id: 'sub-2', subject_name: 'Operating Systems', attended: 14, total: 20, percentage: 70.0 },
  { subject_id: 'sub-3', subject_name: 'Linear Algebra', attended: 19, total: 22, percentage: 86.4 },
  { subject_id: 'sub-4', subject_name: 'Digital Electronics', attended: 9, total: 18, percentage: 50.0 },
];

export const DEMO_ATTENDANCE_RECORDS = [
  { id: 'att-1', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], subject_name: 'Data Structures & Algorithms', status: 'present' },
  { id: 'att-2', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], subject_name: 'Operating Systems', status: 'absent' },
  { id: 'att-3', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], subject_name: 'Linear Algebra', status: 'present' },
  { id: 'att-4', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], subject_name: 'Digital Electronics', status: 'absent' },
  { id: 'att-5', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], subject_name: 'Data Structures & Algorithms', status: 'present' },
];

// Teacher's attendance records for marking
export const DEMO_TEACHER_ATTENDANCE = [
  { id: 'student-1', name: 'Rahul Verma', roll_number: '2024CSE001', status: 'present' },
  { id: 'student-2', name: 'Sneha Patel', roll_number: '2024CSE002', status: 'present' },
  { id: 'student-3', name: 'Aditya Kumar', roll_number: '2024CSE003', status: 'absent' },
  { id: 'student-4', name: 'Kavya Reddy', roll_number: '2024ECE001', status: 'present' },
];

// ============================================================
// Notices
// ============================================================
export const DEMO_NOTICES = [
  {
    id: 'notice-1',
    title: 'Mid-Semester Examination Schedule',
    body: 'The mid-semester examinations for the odd semester 2024-25 will be conducted from October 15-25, 2024. Students must carry their hall tickets. No electronic devices allowed in the examination hall. Results will be declared within 7 working days.',
    ai_summary: '• Mid-sem exams: Oct 15-25, 2024\n• Carry hall tickets; no electronics\n• Results within 7 working days',
    target_scope: 'students',
    author_name: 'Dr. Admin Singh',
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notice-2',
    title: 'Annual Technical Fest - TechNova 2024',
    body: 'CampusCore Demo University proudly presents TechNova 2024, our annual technical festival. Events include coding competitions, hackathons, robotics competitions, and technical paper presentations. Registration closes October 10th. Prize pool: ₹5,00,000.',
    ai_summary: '• TechNova 2024 tech fest announced\n• Events: coding, hackathon, robotics, papers\n• Registration by Oct 10; prize pool ₹5L',
    target_scope: 'all',
    author_name: 'Dr. Admin Singh',
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notice-3',
    title: 'Library Extended Hours During Exam Season',
    body: 'The central library will remain open 24/7 from October 10 to October 30 to support students during examination preparation. Additional reading rooms have been made available. Please maintain silence and follow library rules.',
    ai_summary: '• Library open 24/7: Oct 10-30\n• Extra reading rooms available\n• Maintain silence; follow library rules',
    target_scope: 'students',
    author_name: 'Dr. Admin Singh',
    published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// Notifications
// ============================================================
export const DEMO_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Attendance Warning',
    body: 'Your attendance in Digital Electronics is below 75% (50%). Risk of not being allowed in exams.',
    related_entity_type: 'attendance',
    related_entity_id: 'sub-4',
    is_read: false,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Task Due Tomorrow',
    body: 'DSA Assignment 3 is due tomorrow. Don\'t forget to submit!',
    related_entity_type: 'task',
    related_entity_id: 'task-1',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'New Notice Posted',
    body: 'Mid-Semester Examination Schedule has been published.',
    related_entity_type: 'notice',
    related_entity_id: 'notice-1',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// Placement
// ============================================================
export const DEMO_PLACEMENTS = [
  {
    id: 'place-1',
    company_name: 'TCS',
    role: 'Software Engineer',
    status: 'interview',
    applied_at: '2024-09-01',
    next_step: 'Technical Interview Round 2',
    notes: 'Good progress, prepare system design',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'place-2',
    company_name: 'Infosys',
    role: 'Systems Engineer',
    status: 'offer',
    applied_at: '2024-08-15',
    next_step: 'Offer letter received - ₹6.5 LPA',
    notes: 'Accepted. Join date: Dec 1',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'place-3',
    company_name: 'Google India',
    role: 'Software Engineer Intern',
    status: 'screening',
    applied_at: '2024-09-10',
    next_step: 'Online assessment pending',
    notes: 'Applied via referral',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// Study Groups
// ============================================================
export const DEMO_STUDY_GROUPS = [
  {
    id: 'group-1',
    name: 'DSA Study Circle',
    description: 'Weekly study sessions for DSA preparation and problem solving',
    subject_name: 'Data Structures & Algorithms',
    member_count: 6,
    max_members: 8,
    created_by_name: 'Rahul Verma',
    meeting_schedule: { day: 'Saturday', time: '4:00 PM', platform: 'Google Meet' },
    google_meet_link: 'https://meet.google.com/demo-link',
    is_member: true,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'group-2',
    name: 'OS Concepts Crew',
    description: 'Deep-dive into operating systems concepts and lab prep',
    subject_name: 'Operating Systems',
    member_count: 4,
    max_members: 6,
    created_by_name: 'Sneha Patel',
    meeting_schedule: { day: 'Sunday', time: '10:00 AM', platform: 'Discord' },
    google_meet_link: null,
    is_member: false,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// Students (for teacher view)
// ============================================================
export const DEMO_STUDENTS = [
  {
    id: DEMO_STUDENT_ID,
    full_name: 'Rahul Verma',
    email: 'rahul.verma@demo-university.edu',
    phone: '+919876543211',
    branch: 'CSE',
    year: 3,
    roll_number: '2024CSE001',
    avg_attendance: 72.1,
    pending_tasks: 2,
  },
  {
    id: 'student-2',
    full_name: 'Sneha Patel',
    email: 'sneha.patel@demo-university.edu',
    phone: '+919876543212',
    branch: 'CSE',
    year: 3,
    roll_number: '2024CSE002',
    avg_attendance: 88.5,
    pending_tasks: 1,
  },
  {
    id: 'student-3',
    full_name: 'Aditya Kumar',
    email: 'aditya.kumar@demo-university.edu',
    phone: '+919876543213',
    branch: 'CSE',
    year: 2,
    roll_number: '2024CSE003',
    avg_attendance: 55.0,
    pending_tasks: 3,
  },
  {
    id: 'student-4',
    full_name: 'Kavya Reddy',
    email: 'kavya.reddy@demo-university.edu',
    phone: '+919876543214',
    branch: 'ECE',
    year: 3,
    roll_number: '2024ECE001',
    avg_attendance: 91.2,
    pending_tasks: 0,
  },
];

// ============================================================
// Admin Analytics
// ============================================================
export const DEMO_ANALYTICS = {
  usersByRole: [
    { role: 'student', count: 847 },
    { role: 'teacher', count: 42 },
    { role: 'parent', count: 312 },
    { role: 'admin', count: 3 },
  ],
  avgAttendance: 76,
  noticesTotal: 28,
  tasksByStatus: [
    { status: 'pending', count: 142 },
    { status: 'in_progress', count: 78 },
    { status: 'completed', count: 391 },
    { status: 'overdue', count: 23 },
  ],
  automationLogs: [
    { id: 'log-1', workflow_name: 'attendance_alert', status: 'success', trigger_source: 'n8n', duration_ms: 342, created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    { id: 'log-2', workflow_name: 'task_reminder', status: 'success', trigger_source: 'n8n', duration_ms: 156, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: 'log-3', workflow_name: 'notice_broadcast', status: 'failed', trigger_source: 'direct_api', duration_ms: 0, error_message: 'WhatsApp API rate limit', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  ],
};

// ============================================================
// Parent — child data
// ============================================================
export const DEMO_PARENT_CHILDREN = [
  {
    id: DEMO_STUDENT_ID,
    full_name: 'Rahul Verma',
    email: 'rahul.verma@demo-university.edu',
    branch: 'CSE',
    year: 3,
    roll_number: '2024CSE001',
    attendance_summary: DEMO_ATTENDANCE_SUMMARY,
    pending_tasks: DEMO_TASKS.filter(t => t.status !== 'completed'),
    recent_notices: DEMO_NOTICES.slice(0, 2),
  },
];

// ============================================================
// Notes
// ============================================================
export const DEMO_NOTES = [
  {
    id: 'note-1',
    title: 'Red-Black Tree Properties',
    content: '1. Every node is RED or BLACK\n2. Root is always BLACK\n3. RED nodes have BLACK children\n4. All paths from root to null have same number of BLACK nodes\n5. Insertions are RED by default',
    subject_id: 'sub-1',
    subject_name: 'Data Structures & Algorithms',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'note-2',
    title: 'Process Scheduling Algorithms',
    content: 'FCFS: Non-preemptive, simple\nSJF: Optimal avg waiting time, but starvation\nRound Robin: Preemptive, fair\nPriority: Can starve low-priority, use aging\nMLFQ: Multiple queues with different priorities',
    subject_id: 'sub-2',
    subject_name: 'Operating Systems',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// Institution settings (for admin)
// ============================================================
export const DEMO_INSTITUTION = {
  id: DEMO_INSTITUTION_ID,
  name: 'Demo University',
  slug: 'demo-university',
  domain: 'demo-university.edu',
  logo_url: null,
  attendance_threshold: 75,
  settings: {},
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
};

// ============================================================
// Settings / User profile
// ============================================================
export const DEMO_USER_SETTINGS = {
  theme_preference: 'system',
  notification_prefs: { in_app: true, whatsapp: true, email: true },
};
