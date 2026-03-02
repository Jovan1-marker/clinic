/*
 * ============================================================
 *  MIMS - Landing Page JavaScript (main.js)
 * ============================================================
 *
 *  Handles:
 *    1. Automatic slideshow (every 8 seconds)
 *    2. Dot navigation for slideshow
 *    3. Login modal (open/close)
 *    4. Login form submission (POST /api/login)
 *
 * ============================================================
 */

// Wait for the page to fully load before running scripts
document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
   *  SLIDESHOW LOGIC
   * ========================================================== */

  // Get all slides and dots
  const slides = document.querySelectorAll('.slideshow__slide');
  const dots = document.querySelectorAll('.slideshow__dot');
  let currentSlide = 0; // Track the currently visible slide
  let slideshowInterval;  // Reference to the auto-play interval

  /**
   * goToSlide(index)
   * Switches the visible slide to the given index.
   * Updates both the slide visibility and the dot indicator.
   */
  function goToSlide(index) {
    // Remove "active" class from all slides and dots
    slides.forEach(slide => slide.classList.remove('slideshow__slide--active'));
    dots.forEach(dot => dot.classList.remove('slideshow__dot--active'));

    // Set the new active slide and dot
    currentSlide = index;
    slides[currentSlide].classList.add('slideshow__slide--active');
    dots[currentSlide].classList.add('slideshow__dot--active');
  }

  /**
   * nextSlide()
   * Advances to the next slide. Wraps around to the first slide
   * after the last one.
   */
  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }

  // Start the automatic slideshow — changes every 8 seconds
  function startSlideshow() {
    slideshowInterval = setInterval(nextSlide, 8000);
  }

  // Initialize the slideshow
  startSlideshow();

  // Allow clicking on dots to jump to a specific slide
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const slideIndex = parseInt(dot.getAttribute('data-slide'), 10);
      goToSlide(slideIndex);

      // Reset the auto-play timer so it doesn't jump too quickly
      clearInterval(slideshowInterval);
      startSlideshow();
    });
  });


  /* ==========================================================
   *  LOGIN MODAL LOGIC
   * ========================================================== */

  const loginBtn = document.getElementById('loginBtn');
  const loginModal = document.getElementById('loginModal');
  const closeModal = document.getElementById('closeModal');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  // Open the login modal when "Login" button is clicked
  loginBtn.addEventListener('click', () => {
    loginModal.classList.add('modal-overlay--visible');
  });

  // Close the modal when the X button is clicked
  closeModal.addEventListener('click', () => {
    loginModal.classList.remove('modal-overlay--visible');
    loginError.classList.remove('modal__error--visible');
  });

  // Close the modal when clicking outside the modal card
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      loginModal.classList.remove('modal-overlay--visible');
      loginError.classList.remove('modal__error--visible');
    }
  });

  // Handle login form submission
  loginForm.addEventListener('submit', async (e) => {
    // Prevent the default form submission (page reload)
    e.preventDefault();

    // Get the username and password values
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      // Send a POST request to the login API
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful — redirect based on role
        if (data.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/student';
        }
      } else {
        // Show error message
        loginError.classList.add('modal__error--visible');
      }
    } catch (error) {
      // Network or server error
      console.error('Login error:', error);
      loginError.textContent = 'Server error. Please try again later.';
      loginError.classList.add('modal__error--visible');
    }
  });

});
