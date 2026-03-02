/*
 * ============================================================
 *  MIMS - Student Portal JavaScript (student.js)
 * ============================================================
 *
 *  Handles:
 *    1. Sidebar navigation (section switching)
 *    2. Loading "My Appointments" from the API
 *    3. Submitting appointment requests
 *    4. Submitting feedback/comments
 *    5. Logout functionality
 *
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
   *  SIDEBAR NAVIGATION
   *  Clicking a sidebar link shows the matching section
   *  and hides all others.
   * ========================================================== */

  const sidebarLinks = document.querySelectorAll('.sidebar__link[data-section]');
  const sections = document.querySelectorAll('.portal-section');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetSection = link.getAttribute('data-section');

      // Remove "active" class from all links and sections
      sidebarLinks.forEach(l => l.classList.remove('sidebar__link--active'));
      sections.forEach(s => s.classList.remove('portal-section--active'));

      // Add "active" to the clicked link and its section
      link.classList.add('sidebar__link--active');
      const sectionEl = document.getElementById(`section-${targetSection}`);
      if (sectionEl) {
        sectionEl.classList.add('portal-section--active');
      }

      // Reload data when switching to "My Appointments"
      if (targetSection === 'my-appointments') {
        loadMyAppointments();
      }
    });
  });


  /* ==========================================================
   *  LOAD MY APPOINTMENTS
   *  Fetches all appointments from the API and displays them
   *  in the table.
   * ========================================================== */

  async function loadMyAppointments() {
    try {
      const response = await fetch('/api/appointments');
      const appointments = await response.json();

      const tableBody = document.getElementById('myAppointmentsTable');

      // If no appointments, show placeholder message
      if (appointments.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center" style="padding: 2rem; color: #6C757D;">
              No appointments yet. Request one from the sidebar!
            </td>
          </tr>
        `;
        return;
      }

      // Build the table rows
      tableBody.innerHTML = appointments.map((apt, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${apt.service_type}</td>
          <td>${apt.description || '—'}</td>
          <td>
            <span class="badge badge--${apt.status}">
              ${apt.status}
            </span>
          </td>
          <td>${new Date(apt.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');

    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  }

  // Load appointments on page load
  loadMyAppointments();


  /* ==========================================================
   *  SUBMIT APPOINTMENT REQUEST
   *  Sends the form data to POST /api/appointments
   * ========================================================== */

  const appointmentForm = document.getElementById('appointmentForm');
  const appointmentSuccess = document.getElementById('appointmentSuccess');

  appointmentForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    // Gather form values
    const formData = {
      service_type: document.getElementById('serviceType').value,
      student_name: document.getElementById('studentName').value.trim(),
      grade: document.getElementById('studentGrade').value.trim(),
      lrn: document.getElementById('studentLRN').value.trim(),
      description: document.getElementById('appointmentDesc').value.trim()
    };

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // Show success message and reset the form
        appointmentSuccess.classList.remove('hidden');
        appointmentForm.reset();

        // Hide success message after 5 seconds
        setTimeout(() => {
          appointmentSuccess.classList.add('hidden');
        }, 5000);
      }
    } catch (error) {
      console.error('Error submitting appointment:', error);
      alert('Failed to submit appointment. Please try again.');
    }
  });


  /* ==========================================================
   *  SUBMIT FEEDBACK / COMMENT
   *  Sends the feedback to POST /api/feedback
   * ========================================================== */

  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackSuccess = document.getElementById('feedbackSuccess');

  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = document.getElementById('feedbackMessage').value.trim();

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, submitted_by: 'Student' })
      });

      if (response.ok) {
        feedbackSuccess.classList.remove('hidden');
        feedbackForm.reset();

        setTimeout(() => {
          feedbackSuccess.classList.add('hidden');
        }, 5000);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  });


  /* ==========================================================
   *  LOGOUT
   *  Redirects back to the landing page
   * ========================================================== */

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      // Ignore logout errors
    }
    window.location.href = '/';
  });

});
