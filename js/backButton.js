// backButton.js
function scrollPrev() {
  window.scrollTo({
    top: window.scrollY - window.innerHeight,
    behavior: "smooth"
  });
}
