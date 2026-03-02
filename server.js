/*
 * ============================================================
 *  MIMS - Medical Information Management System
 *  Backend Server (Node.js + Express + SQLite)
 * ============================================================
 *  
 *  HOW TO RUN:
 *    1. Open a terminal in this folder
 *    2. Run: npm install
 *    3. Run: npm start
 *    4. Open http://localhost:3000 in your browser
 *
 * ============================================================
 */

// --- Import Required Packages ---
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');

// --- Create Express App ---
const app = express();
const PORT = 3000;

// --- Middleware Setup ---
// Parse JSON request bodies (for API calls)
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware for login tracking
app.use(session({
  secret: 'mims-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));


/* ============================================================
 *  DATABASE SETUP
 * ============================================================ */

// Create (or open) the SQLite database file
const db = new Database(path.join(__dirname, 'database.sqlite'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// --- Create Tables ---

// Users table: stores login credentials for admin and students
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
    full_name TEXT NOT NULL
  );
`);

// Patients table: stores medical information for each patient
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    lrn TEXT UNIQUE NOT NULL,
    grade_section TEXT DEFAULT '',
    height TEXT DEFAULT '',
    weight TEXT DEFAULT '',
    bmi TEXT DEFAULT '',
    medical_history TEXT DEFAULT 'None',
    clinic_exposure TEXT DEFAULT 'None',
    email TEXT DEFAULT '',
    home_address TEXT DEFAULT '',
    contact_no TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Appointments table: stores appointment requests from students
db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    grade TEXT DEFAULT '',
    lrn TEXT DEFAULT '',
    service_type TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Waitlist table: stores approved appointments
db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT DEFAULT '',
    approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  );
`);

// Feedback table: stores comments/feedback from students
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    submitted_by TEXT DEFAULT 'Anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Records table: stores medical records (like a document manager)
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Record',
    content TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);


/* ============================================================
 *  SEED DATA - Pre-fill the database with sample data
 * ============================================================ */

// Only seed if users table is empty (first run)
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

if (userCount.count === 0) {
  console.log('📦 Seeding database with initial data...');

  // --- Insert Default Users ---
  const insertUser = db.prepare(
    'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)'
  );
  insertUser.run('admin', 'admin123', 'admin', 'Clinic Administrator');
  insertUser.run('student', 'student123', 'student', 'Student User');

  // --- Insert 10 Pre-filled Patients ---
  const insertPatient = db.prepare(`
    INSERT INTO patients (full_name, lrn, grade_section, height, weight, bmi, medical_history, clinic_exposure)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const patients = [
    ['Jake Patrick A. Baron',       '136888141225', '12 ICT - THALES', '165cm', '59kg', 'Normal',      'Asthma',     'None'],
    ['Caylle Nathaniel D. Rico',    '488051150121', '12 ICT - THALES', '156cm', '45kg', 'Normal',      'None',       'None'],
    ['Mart D. Bernacer',            '136591131208', '12 ICT - THALES', '160cm', '43kg', 'Normal',      'None',       'None'],
    ['Christian B. Rasonabe',       '136891131615', '12 ICT - THALES', '159cm', '60kg', 'Normal',      'None',       'None'],
    ['Jhon Carl D. Villacarlos',    '136886150197', '12 ICT - THALES', '165cm', '70kg', 'Overweight',  'None',       'None'],
    ['Haezel Marie B. Maganding',   '136514120335', '12 ICT - THALES', '162cm', '40kg', 'Underweight', 'None',       'Yes, 3 times'],
    ['Roncedrick A. Relampagos',    '136891131844', '12 ICT - THALES', '5\'4',  '58kg', 'Normal',      'None',       'None'],
    ['Dhan Alfred E. Ordeniza',     '488047150113', '12 ICT - THALES', '171cm', '60kg', 'Normal',      'Anemic',     'Yes, 4 times'],
    ['Lance Jhenel O. Avila',       '136885140567', '12 ICT - THALES', '166cm', '54kg', 'Normal',      'Asthma',     'None'],
    ['Zyron Drei D. Nacionales',    '407278150268', '12 ICT - THALES', '180cm', '116kg','Overweight',  'High Blood', 'Yes, 3 times']
  ];

  // Insert all patients using a transaction for speed
  const insertMany = db.transaction((patients) => {
    for (const p of patients) {
      insertPatient.run(...p);
    }
  });
  insertMany(patients);

  console.log('✅ Database seeded with 2 users and 10 patients.');
}


/* ============================================================
 *  API ROUTES
 * ============================================================ */

// ----- AUTHENTICATION -----

// POST /api/login - Handle user login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Look up the user in the database
  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? AND password = ?'
  ).get(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Save user info in session
  req.session.user = { id: user.id, role: user.role, full_name: user.full_name };

  // Return the user's role so the frontend knows where to redirect
  res.json({ role: user.role, full_name: user.full_name });
});

// POST /api/logout - Handle user logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});


// ----- PATIENTS -----

// GET /api/patients - Retrieve all patients
app.get('/api/patients', (req, res) => {
  const patients = db.prepare('SELECT * FROM patients ORDER BY id ASC').all();
  res.json(patients);
});

// PUT /api/patients/:id - Update a patient's info (email, address, contact)
app.put('/api/patients/:id', (req, res) => {
  const { email, home_address, contact_no } = req.body;
  const { id } = req.params;

  db.prepare(`
    UPDATE patients SET email = ?, home_address = ?, contact_no = ? WHERE id = ?
  `).run(email || '', home_address || '', contact_no || '', id);

  res.json({ message: 'Patient updated successfully' });
});


// ----- APPOINTMENTS -----

// GET /api/appointments - Retrieve all appointments
app.get('/api/appointments', (req, res) => {
  const appointments = db.prepare(
    'SELECT * FROM appointments ORDER BY created_at DESC'
  ).all();
  res.json(appointments);
});

// POST /api/appointments - Create a new appointment request
app.post('/api/appointments', (req, res) => {
  const { student_name, grade, lrn, service_type, description } = req.body;

  const result = db.prepare(`
    INSERT INTO appointments (student_name, grade, lrn, service_type, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(student_name, grade || '', lrn || '', service_type, description || '');

  res.json({ message: 'Appointment requested successfully', id: result.lastInsertRowid });
});

// PUT /api/appointments/:id/approve - Approve an appointment (moves to waitlist)
app.put('/api/appointments/:id/approve', (req, res) => {
  const { id } = req.params;

  // Get the appointment details
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  // Update the appointment status to "approved"
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('approved', id);

  // Add it to the waitlist
  db.prepare(`
    INSERT INTO waitlist (appointment_id, student_name, service_type, description)
    VALUES (?, ?, ?, ?)
  `).run(id, appointment.student_name, appointment.service_type, appointment.description);

  res.json({ message: 'Appointment approved and added to waitlist' });
});

// PUT /api/appointments/:id/deny - Deny an appointment
app.put('/api/appointments/:id/deny', (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('denied', id);
  res.json({ message: 'Appointment denied' });
});


// ----- WAITLIST -----

// GET /api/waitlist - Retrieve all waitlisted appointments
app.get('/api/waitlist', (req, res) => {
  const waitlist = db.prepare(
    'SELECT * FROM waitlist ORDER BY approved_at DESC'
  ).all();
  res.json(waitlist);
});


// ----- FEEDBACK -----

// GET /api/feedback - Retrieve all feedback messages
app.get('/api/feedback', (req, res) => {
  const feedback = db.prepare(
    'SELECT * FROM feedback ORDER BY created_at DESC'
  ).all();
  res.json(feedback);
});

// POST /api/feedback - Submit new feedback
app.post('/api/feedback', (req, res) => {
  const { message, submitted_by } = req.body;
  db.prepare(
    'INSERT INTO feedback (message, submitted_by) VALUES (?, ?)'
  ).run(message, submitted_by || 'Anonymous');
  res.json({ message: 'Feedback submitted successfully' });
});


// ----- RECORDS -----

// GET /api/records - Retrieve all records
app.get('/api/records', (req, res) => {
  const records = db.prepare(
    'SELECT * FROM records ORDER BY updated_at DESC'
  ).all();
  res.json(records);
});

// POST /api/records - Create a new record
app.post('/api/records', (req, res) => {
  const { title } = req.body;
  const result = db.prepare(
    'INSERT INTO records (title) VALUES (?)'
  ).run(title || 'Untitled Record');
  res.json({ message: 'Record created', id: result.lastInsertRowid });
});

// PUT /api/records/:id - Update a record's content
app.put('/api/records/:id', (req, res) => {
  const { title, content } = req.body;
  const { id } = req.params;
  db.prepare(`
    UPDATE records SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(title, content, id);
  res.json({ message: 'Record saved successfully' });
});

// DELETE /api/records/:id - Delete a record
app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM records WHERE id = ?').run(id);
  res.json({ message: 'Record deleted' });
});


/* ============================================================
 *  SERVE HTML PAGES
 * ============================================================ */

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Student portal
app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// Admin portal
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


/* ============================================================
 *  START THE SERVER
 * ============================================================ */
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   MIMS - Medical Information Management      ║
  ║   Server running at http://localhost:${PORT}     ║
  ║                                               ║
  ║   Login Credentials:                          ║
  ║   Admin  → admin / admin123                   ║
  ║   Student → student / student123              ║
  ╚═══════════════════════════════════════════════╝
  `);
});