// Custom JavaScript for your website

document.addEventListener('DOMContentLoaded', function() {
  console.log('Website loaded successfully!');
  
  // Header scroll effect
  const navbar = document.getElementById('mainNav');
  const navbarStyle = navbar.getAttribute('data-navbar-style') || 'light';
  
  // Set initial navbar theme
  if (navbarStyle === 'dark') {
    navbar.classList.add('navbar-dark');
    navbar.classList.remove('navbar-light');
  } else {
    navbar.classList.add('navbar-light');
    navbar.classList.remove('navbar-dark');
  }
  
  function updateNavbar() {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  
  // Update on scroll
  window.addEventListener('scroll', updateNavbar);
  
  // Update on load (in case page is already scrolled)
  updateNavbar();
  
  // Add active class to current nav item
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Product detail page - thumbnail click to navigate carousel
  document.querySelectorAll('.thumbnail-image').forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
      const carouselTarget = this.getAttribute('data-bs-target');
      const slideIndex = this.getAttribute('data-bs-slide-to');
      
      if (carouselTarget && slideIndex) {
        const carousel = document.querySelector(carouselTarget);
        if (carousel) {
          const bsCarousel = bootstrap.Carousel.getInstance(carousel) || new bootstrap.Carousel(carousel);
          bsCarousel.to(parseInt(slideIndex));
        }
      }
    });
  });
  
  // Parallax effect for hero section
  const hero = document.querySelector('.hero');
  const heroContent = document.querySelector('.hero > .container');
  
  if (hero && heroContent) {
    // Parallax speed settings (adjust these values!)
    const BACKGROUND_SPEED = 0.3;  // Background moves at 30% of scroll speed (slower)
    const TEXT_SPEED = 0.6;         // Text moves at 60% of scroll speed (faster)
    const ENABLE_FADE = true;       // Fade out text while scrolling
    
    // Set custom overlay opacity if numeric value provided
    const overlayValue = hero.getAttribute('data-overlay');
    if (overlayValue && !isNaN(overlayValue) && overlayValue !== 'light' && overlayValue !== 'medium' && overlayValue !== 'dark' && overlayValue !== 'none') {
      hero.style.setProperty('--overlay-opacity', overlayValue);
    }
    
    // Initialize background position to prevent jump on first scroll
    hero.style.backgroundPosition = 'center 0px';
    
    let ticking = false;
    
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          const scrolled = window.pageYOffset;
          const heroHeight = hero.offsetHeight;
          
          // Only apply parallax while hero is visible
          if (scrolled < heroHeight) {
            // Move background (slower)
            const backgroundOffset = scrolled * BACKGROUND_SPEED;
            hero.style.backgroundPosition = `center ${backgroundOffset}px`;
            
            // Move text content (faster than background)
            const contentOffset = scrolled * TEXT_SPEED;
            heroContent.style.transform = `translateY(${40 + contentOffset}px)`;
            
            // Optional: Fade out effect as you scroll
            if (ENABLE_FADE) {
              const opacity = 1 - (scrolled / heroHeight);
              heroContent.style.opacity = Math.max(opacity, 0);
            }
          }
          
          ticking = false;
        });
        
        ticking = true;
      }
    });
  }
});
