// scroll.js
// snap + clamp scroll logic across sections

function getSections() {
  return Array.from(document.querySelectorAll('section.snap-section'));
}

function viewportH() {
  return window.innerHeight;
}

function clampIndex(i, len) {
  return Math.max(0, Math.min(len - 1, i));
}

function scrollToIndex(i, smooth = true) {
  const top = clampIndex(i, getSections().length) * viewportH();
  window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}

function currentIndex() {
  return Math.round(window.scrollY / viewportH());
}

function scrollNext() {
  const idx = currentIndex();
  const len = getSections().length;
  scrollToIndex(clampIndex(idx + 1, len));
}

function scrollPrev() {
  const idx = currentIndex();
  scrollToIndex(clampIndex(idx - 1, getSections().length));
}

// Helper: is the event within a scrollable section and not at an edge?
function atScrollableEdge(target, direction) {
  const section = target.closest('.snap-section');
  if (!section) return false;

  // If section is internally scrollable
  const max = section.scrollHeight - section.clientHeight;
  if (max <= 0) return true; // no internal scroll, treat as edge

  const top = Math.ceil(section.scrollTop);
  const atTop = top <= 0;
  const atBottom = top >= max;

  // If scrolling down at bottom or up at top, we are at an edge
  return direction > 0 ? atBottom : atTop;
}

// Wheel-based snap with overscroll clamp at last section
let wheelLock = false;
window.addEventListener("wheel", (e) => {
  // allow zoom gestures
  if (e.ctrlKey) return;

  // If target is inside a scrollable section and not at edge, allow default
  const direction = e.deltaY > 0 ? 1 : -1;
  if (!atScrollableEdge(e.target, direction)) return;

  // From here, we control the snap scroll
  e.preventDefault(); // prevent free scrolling
  if (wheelLock) return;
  wheelLock = true;

  const sections = getSections();
  const len = sections.length;
  const idx = currentIndex();

  // Clamp overscroll at last section bottom
  if (direction > 0 && idx >= len - 1) {
    const last = sections[len - 1];
    const maxInner = last.scrollHeight - last.clientHeight;
    const atBottomInside = maxInner <= 0 || Math.ceil(last.scrollTop) >= maxInner;
    if (atBottomInside) {
      // hard clamp at last section top; no further scrolling allowed
      window.scrollTo({ top: (len - 1) * viewportH(), behavior: "auto" });
      wheelLock = false;
      return;
    }
  }

  const next = clampIndex(idx + direction, len);
  scrollToIndex(next);

  setTimeout(() => (wheelLock = false), 500);
}, { passive: false });

// Touch support (mobile) with overscroll clamp
let touchStartY = 0;
window.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  const delta = touchStartY - e.touches[0].clientY; // >0 is down
  const direction = delta > 0 ? 1 : -1;

  // If not at a scrollable edge, let default happen
  if (!atScrollableEdge(e.target, direction)) return;

  e.preventDefault();

  const sections = getSections();
  const len = sections.length;
  const idx = currentIndex();

  if (direction > 0 && idx >= len - 1) {
    const last = sections[len - 1];
    const maxInner = last.scrollHeight - last.clientHeight;
    const atBottomInside = maxInner <= 0 || Math.ceil(last.scrollTop) >= maxInner;
    if (atBottomInside) {
      window.scrollTo({ top: (len - 1) * viewportH(), behavior: "auto" });
      return; // block further movement
    }
  }

  const next = clampIndex(idx + direction, len);
  scrollToIndex(next);
}, { passive: false });

// Keyboard accessibility: PageUp/PageDown and Arrow keys
window.addEventListener("keydown", (e) => {
  if (["PageDown", "ArrowDown", "Space"].includes(e.code)) {
    e.preventDefault();
    scrollNext();
  } else if (["PageUp", "ArrowUp"].includes(e.code)) {
    e.preventDefault();
    scrollPrev();
  }
});

// Scroll-triggered fade for Discover section items and section in-view state
document.addEventListener('DOMContentLoaded', function () {
  const discoverSection = document.querySelector('#charts-section.discover');
  if (discoverSection) {
    const items = Array.from(discoverSection.querySelectorAll('.fade-on-scroll'));

    // Reveal items immediately if IntersectionObserver is unavailable
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('visible'));
    } else {
      const itemsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const el = entry.target;
          if (entry.isIntersecting) el.classList.add('visible');
        });
      }, { root: null, threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
      items.forEach(el => itemsObserver.observe(el));

      const sectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) discoverSection.classList.add('in-view');
        else discoverSection.classList.remove('in-view');
      }, { threshold: 0.35 });
      sectionObserver.observe(discoverSection);
    }
  }

  // Background section: toggle 'in-view' to trigger back-btn entrance animation
  const bgSection = document.querySelector('#background-section');
  if (bgSection) {
    if (!('IntersectionObserver' in window)) {
      // Fallback: mark as in-view on load
      bgSection.classList.add('in-view');
    } else {
      const bgObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) bgSection.classList.add('in-view');
        else bgSection.classList.remove('in-view');
      }, { threshold: 0.35 });
      bgObserver.observe(bgSection);
    }
  }

  // Landing section (section1): toggle 'in-view' for fade-up sequencing
  const landing = document.querySelector('#section1');
  if (landing) {
    if (!('IntersectionObserver' in window)) {
      landing.classList.add('in-view');
    } else {
      const landingObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) landing.classList.add('in-view');
        else landing.classList.remove('in-view');
      }, { threshold: 0.35 });
      landingObserver.observe(landing);
    }
  }
});