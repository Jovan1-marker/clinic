/*
 * ============================================================
 *  MIMS - Admin Portal JavaScript (admin.js)
 * ============================================================
 *
 *  Handles:
 *    1. Sidebar navigation (section switching)
 *    2. Loading & displaying patient cards
 *    3. Appointment management (approve/deny)
 *    4. Waitlist display
 *    5. Medical Records (create, edit, save, delete)
 *    6. Feedback display
 *    7. Logout functionality
 *
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
   *  SIDEBAR NAVIGATION
   * ========================================================== */

  const sidebarLinks = document.querySelectorAll('.sidebar__link[data-section]');
  const sections = document.querySelectorAll('.portal-section');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetSection = link.getAttribute('data-section');

      // Toggle active states
      sidebarLinks.forEach(l => l.classList.remove('sidebar__link--active'));
      sections.forEach(s => s.classList.remove('portal-section--active'));
      link.classList.add('sidebar__link--active');

      const sectionEl = document.getElementById(`section-${targetSection}`);
      if (sectionEl) sectionEl.classList.add('portal-section--active');

      // Reload data for the active section
      switch (targetSection) {
        case 'patients': loadPatients(); break;
        case 'appointments': loadAppointments(); break;
        case 'waitlist': loadWaitlist(); break;
        case 'records': loadRecords(); break;
        case 'feedback': loadFeedback(); break;
      }
    });
  });


  /* ==========================================================
   *  1. PATIENTS
   *  Loads patient data and renders cards with editable
   *  sensitive fields (email, address, contact).
   * ========================================================== */

  async function loadPatients() {
    try {
      const response = await fetch('/api/patients');
      const patients = await response.json();
      const grid = document.getElementById('patientGrid');

      if (patients.length === 0) {
        grid.innerHTML = '<p style="color: #6C757D; padding: 2rem;">No patients found.</p>';
        return;
      }

      // Build a card for each patient
      grid.innerHTML = patients.map(patient => `
        <div class="patient-card">
          <!-- Patient Name -->
          <div class="patient-card__name">${patient.full_name}</div>

          <!-- Basic Medical Info -->
          <div class="patient-card__info">
            <span><span class="patient-card__label">LRN:</span> ${patient.lrn}</span>
            <span><span class="patient-card__label">Section:</span> ${patient.grade_section || '—'}</span>
            <span><span class="patient-card__label">Height:</span> ${patient.height || '—'}</span>
            <span><span class="patient-card__label">Weight:</span> ${patient.weight || '—'}</span>
            <span><span class="patient-card__label">BMI:</span> ${patient.bmi || '—'}</span>
            <span><span class="patient-card__label">History:</span> ${patient.medical_history || 'None'}</span>
            <span><span class="patient-card__label">Clinic Exposure:</span> ${patient.clinic_exposure || 'None'}</span>
          </div>

          <!-- Editable Sensitive Fields -->
          <div class="patient-card__sensitive">
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" class="form-input" id="email-${patient.id}" value="${patient.email || ''}" placeholder="Enter email..." />
            </div>
            <div class="form-group">
              <label>Home Address</label>
              <input type="text" class="form-input" id="address-${patient.id}" value="${patient.home_address || ''}" placeholder="Enter address..." />
            </div>
            <div class="form-group">
              <label>Contact No.</label>
              <input type="text" class="form-input" id="contact-${patient.id}" value="${patient.contact_no || ''}" placeholder="Enter contact number..." />
            </div>
            <button class="btn btn--success btn--sm" onclick="savePatient(${patient.id})">
              💾 Save
            </button>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading patients:', error);
    }
  }

  // Make savePatient globally accessible (used in onclick)
  window.savePatient = async function(patientId) {
    const email = document.getElementById(`email-${patientId}`).value;
    const home_address = document.getElementById(`address-${patientId}`).value;
    const contact_no = document.getElementById(`contact-${patientId}`).value;

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, home_address, contact_no })
      });

      if (response.ok) {
        alert('✅ Patient info saved successfully!');
      }
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Failed to save. Please try again.');
    }
  };

  // Load patients on page load
  loadPatients();


  /* ==========================================================
   *  2. APPOINTMENTS
   *  Shows pending appointments with approve/deny buttons.
   * ========================================================== */

  async function loadAppointments() {
    try {
      const response = await fetch('/api/appointments');
      const appointments = await response.json();
      const tableBody = document.getElementById('appointmentsTable');

      if (appointments.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center" style="padding: 2rem; color: #6C757D;">
              No appointment requests yet.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = appointments.map((apt, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${apt.student_name}</td>
          <td>${apt.grade || '—'}</td>
          <td>${apt.lrn || '—'}</td>
          <td>${apt.service_type}</td>
          <td>${apt.description || '—'}</td>
          <td>
            <span class="badge badge--${apt.status}">${apt.status}</span>
          </td>
          <td>
            ${apt.status === 'pending' ? `
              <button class="btn btn--success btn--sm" onclick="approveAppointment(${apt.id})">Approve</button>
              <button class="btn btn--danger btn--sm" onclick="denyAppointment(${apt.id})">Deny</button>
            ` : '—'}
          </td>
        </tr>
      `).join('');

    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  }

  // Approve an appointment (moves it to waitlist)
  window.approveAppointment = async function(id) {
    try {
      const response = await fetch(`/api/appointments/${id}/approve`, { method: 'PUT' });
      if (response.ok) {
        alert('✅ Appointment approved and moved to Waitlist!');
        loadAppointments(); // Refresh the table
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
    }
  };

  // Deny an appointment
  window.denyAppointment = async function(id) {
    try {
      const response = await fetch(`/api/appointments/${id}/deny`, { method: 'PUT' });
      if (response.ok) {
        alert('Appointment denied.');
        loadAppointments();
      }
    } catch (error) {
      console.error('Error denying appointment:', error);
    }
  };


  /* ==========================================================
   *  3. WAITLIST
   *  Shows approved appointments.
   * ========================================================== */

  async function loadWaitlist() {
    try {
      const response = await fetch('/api/waitlist');
      const waitlist = await response.json();
      const tableBody = document.getElementById('waitlistTable');

      if (waitlist.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center" style="padding: 2rem; color: #6C757D;">
              No approved appointments in the waitlist.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = waitlist.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.student_name}</td>
          <td>${item.service_type}</td>
          <td>${item.description || '—'}</td>
          <td>${new Date(item.approved_at).toLocaleDateString()}</td>
        </tr>
      `).join('');

    } catch (error) {
      console.error('Error loading waitlist:', error);
    }
  }


  /* ==========================================================
   *  4. RECORDS (Google Drive-style File Manager)
   *  Create, edit, save, and delete medical records.
   * ========================================================== */

  let currentRecordId = null; // Track which record is being edited

  // Load all records and render as document icons
  async function loadRecords() {
    try {
      const response = await fetch('/api/records');
      const records = await response.json();
      const grid = document.getElementById('recordsGrid');

      if (records.length === 0) {
        grid.innerHTML = '<p style="color: #6C757D;">No records yet. Create one above!</p>';
        return;
      }

      grid.innerHTML = records.map(record => `
        <div class="record-card ${currentRecordId === record.id ? 'record-card--active' : ''}"
             onclick="openRecord(${record.id})"
             title="Click to edit">
          <div class="record-card__icon">📄</div>
          <div class="record-card__title">${record.title}</div>
          <div class="record-card__date">${new Date(record.updated_at).toLocaleDateString()}</div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading records:', error);
    }
  }

  // Create a new record
  document.getElementById('createRecordBtn').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Record' })
      });

      if (response.ok) {
        const data = await response.json();
        loadRecords(); // Refresh the grid
        openRecord(data.id); // Open the new record for editing
      }
    } catch (error) {
      console.error('Error creating record:', error);
    }
  });

  // Open a record in the editor
  window.openRecord = async function(id) {
    try {
      const response = await fetch('/api/records');
      const records = await response.json();
      const record = records.find(r => r.id === id);

      if (!record) return;

      currentRecordId = record.id;

      // Fill the editor fields
      document.getElementById('recordTitle').value = record.title;
      document.getElementById('recordContent').value = record.content || '';

      // Show the editor
      document.getElementById('recordEditor').classList.add('record-editor--visible');

      // Refresh grid to highlight active record
      loadRecords();
    } catch (error) {
      console.error('Error opening record:', error);
    }
  };

  // Save the current record
  document.getElementById('saveRecordBtn').addEventListener('click', async () => {
    if (!currentRecordId) return;

    const title = document.getElementById('recordTitle').value.trim() || 'Untitled Record';
    const content = document.getElementById('recordContent').value;

    try {
      const response = await fetch(`/api/records/${currentRecordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      if (response.ok) {
        alert('✅ Record saved!');
        loadRecords();
      }
    } catch (error) {
      console.error('Error saving record:', error);
    }
  });

  // Delete the current record
  document.getElementById('deleteRecordBtn').addEventListener('click', async () => {
    if (!currentRecordId) return;

    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`/api/records/${currentRecordId}`, { method: 'DELETE' });
      if (response.ok) {
        currentRecordId = null;
        document.getElementById('recordEditor').classList.remove('record-editor--visible');
        loadRecords();
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  });

  // Close the editor
  document.getElementById('closeEditorBtn').addEventListener('click', () => {
    currentRecordId = null;
    document.getElementById('recordEditor').classList.remove('record-editor--visible');
    loadRecords();
  });


  /* ==========================================================
   *  5. FEEDBACK
   *  Displays feedback messages from students.
   * ========================================================== */

  async function loadFeedback() {
    try {
      const response = await fetch('/api/feedback');
      const feedbackList = await response.json();
      const tableBody = document.getElementById('feedbackTable');

      if (feedbackList.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center" style="padding: 2rem; color: #6C757D;">
              No feedback received yet.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = feedbackList.map((fb, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${fb.message}</td>
          <td>${fb.submitted_by || 'Anonymous'}</td>
          <td>${new Date(fb.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');

    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  }


  /* ==========================================================
   *  6. LOGOUT
   * ========================================================== */

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      // Ignore errors
    }
    window.location.href = '/';
  });

});