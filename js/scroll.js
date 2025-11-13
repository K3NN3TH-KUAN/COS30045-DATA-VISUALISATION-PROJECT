// scroll.js
function scrollNext() {
  const current = window.scrollY;
  const height = window.innerHeight;
  window.scrollTo({
    top: current + height,
    behavior: "smooth"
  });
}

// Also allow mouse wheel one-screen snapping
let isScrolling = false;

window.addEventListener("wheel", (e) => {
  if (isScrolling) return;
  isScrolling = true;

  const direction = e.deltaY > 0 ? 1 : -1;
  const next = window.scrollY + direction * window.innerHeight;

  window.scrollTo({
    top: next,
    behavior: "smooth"
  });

  setTimeout(() => (isScrolling = false), 800);
});
