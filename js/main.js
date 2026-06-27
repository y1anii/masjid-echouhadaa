/**
 * مسجد الشهداء — Phase 1
 * Shared: nav, page transition, scroll reveal, active links
 */

document.documentElement.classList.add('js-enabled');

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.querySelector('.page-transition-overlay');
  if (overlay) {
    requestAnimationFrame(() => {
      overlay.classList.add('is-loaded');
    });
  }

  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const navbar = document.querySelector('.navbar');
  const scrollHint = document.querySelector('.scroll-hint');

  const closeMenu = () => {
    navLinks?.classList.remove('is-open');
    navToggle?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
      dropdown.classList.remove('is-active');
      dropdown.querySelector('.dropdown-toggle')?.setAttribute('aria-expanded', 'false');
    });
  };

  const brandLink = document.querySelector('.navbar-brand');
  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      let currentPage = window.location.pathname.split('/').pop();
      if (!currentPage || !currentPage.includes('.')) currentPage = 'index.html';
      if (currentPage === 'index.html') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        closeMenu();
      }
    });
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = navLinks.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        closeMenu();
      }
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      if (!link.classList.contains('dropdown-toggle')) {
        link.addEventListener('click', closeMenu);
      }
    });

    // Handle dropdown menus
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      if (toggle) {
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropdowns.forEach(other => {
            if (other !== dropdown) {
              other.classList.remove('is-active');
            }
          });
          const active = dropdown.classList.toggle('is-active');
          toggle.setAttribute('aria-expanded', active ? 'true' : 'false');
        });
      }
    });
  }

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          navbar?.classList.toggle('is-scrolled', y > 40);
          scrollHint?.classList.toggle('is-hidden', y > 60);
          ticking = false;
        });
      }
    },
    { passive: true }
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  window.initRevealOnScroll = () => {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
      revealObserver.observe(el);
    });
  };

  // Run initial scan
  window.initRevealOnScroll();

  document.querySelectorAll('.card-grid .nav-card').forEach((card, i) => {
    card.style.transitionDelay = `${0.1 + i * 0.08}s`;
  });

  let currentPage = window.location.pathname.split('/').pop();
  if (!currentPage || !currentPage.includes('.')) currentPage = 'index.html';

  document.querySelectorAll('.nav-links a').forEach((link) => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

  // --- Prayer Times Feature ---
  const fajrEl = document.getElementById('time-fajr');
  if (fajrEl) {
    function getPrayerTimes(date) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const d = Math.floor(diff / oneDay);

      // Radial day for summer solstice (June 21 = day 172)
      const rad = (d - 172) * 2 * Math.PI / 365;
      const cosVal = Math.cos(rad);

      // Equation of Time (EqT) approximation in hours
      const eqtRad1 = (d - 81) * 2 * Math.PI / 365;
      const EqT = 0.165 * Math.sin(2 * eqtRad1) - 0.125 * Math.cos(eqtRad1);

      // Coordinates: Ibachirene (lat: 36.725, lng: 5.005, timezone: GMT+1)
      const dhuhrTime = 12.692 - EqT;

      // Calibration of curves to match official Bejaia Ministry of Religious Affairs timings
      // Fajr: Mean 4.932 hours, Amp 1.39 hours
      const fajrTime = 4.932 - 1.39 * cosVal - EqT;

      // Shuruq: Mean 6.601 hours, Amp 1.235 hours
      const shuruqTime = 6.601 - 1.235 * cosVal - EqT;

      // Asr: Mean 15.885 hours, Amp 0.69 hours
      const asrTime = 15.885 + 0.69 * cosVal - EqT;

      // Maghrib (Sunset): Mean 18.809 hours, Amp 1.26 hours
      const maghribTime = 18.809 + 1.26 * cosVal - EqT;

      // Isha: Mean 20.307 hours, Amp 1.42 hours
      const ishaTime = 20.307 + 1.42 * cosVal - EqT;

      const formatTime = (hours) => {
        let h = Math.floor(hours);
        let m = Math.round((hours - h) * 60);
        if (m === 60) { h += 1; m = 0; }
        h = h % 24;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      return {
        fajr: formatTime(fajrTime),
        shuruq: formatTime(shuruqTime),
        dhuhr: formatTime(dhuhrTime),
        asr: formatTime(asrTime),
        maghrib: formatTime(maghribTime),
        isha: formatTime(ishaTime),
      };
    }

    function updatePrayerTimes() {
      const now = new Date();
      const times = getPrayerTimes(now);

      document.getElementById('time-fajr').textContent = times.fajr;
      document.getElementById('time-shuruq').textContent = times.shuruq;
      document.getElementById('time-dhuhr').textContent = times.dhuhr;
      document.getElementById('time-asr').textContent = times.asr;
      document.getElementById('time-maghrib').textContent = times.maghrib;
      document.getElementById('time-isha').textContent = times.isha;

      const gregOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' };
      document.getElementById('date-gregorian').textContent = now.toLocaleDateString('ar-DZ-u-nu-latn', gregOptions);

      try {
        const hijriOptions = { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' };
        const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', hijriOptions);
        document.getElementById('date-hijri').textContent = formatter.format(now);
      } catch (err) {
        document.getElementById('date-hijri').textContent = now.toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' });
      }

      const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const prayerIds = ['fajr', 'shuruq', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const prayerTimesMinutes = [
        toMinutes(times.fajr),
        toMinutes(times.shuruq),
        toMinutes(times.dhuhr),
        toMinutes(times.asr),
        toMinutes(times.maghrib),
        toMinutes(times.isha)
      ];

      let nextIndex = 0;
      for (let i = 0; i < prayerTimesMinutes.length; i++) {
        if (currentMinutes < prayerTimesMinutes[i]) {
          nextIndex = i;
          break;
        }
        if (i === prayerTimesMinutes.length - 1) {
          nextIndex = 0;
        }
      }

      prayerIds.forEach(id => {
        document.getElementById(`prayer-${id}`)?.classList.remove('is-next');
      });
      document.getElementById(`prayer-${prayerIds[nextIndex]}`)?.classList.add('is-next');
    }

    updatePrayerTimes();
    setInterval(updatePrayerTimes, 30000);
  }
});
