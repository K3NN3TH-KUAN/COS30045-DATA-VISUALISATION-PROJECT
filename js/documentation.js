
// Enable progressive enhancement styles
document.body.classList.add('js');

// Tabs + animated section transitions (kept and now run reliably)
(function () {
    const nav = document.querySelector('.primary-nav');
    if (!nav) return;

    const tabs = Array.from(nav.querySelectorAll('a'));
    const panels = Array.from(document.querySelectorAll('.section-panel'));

    function activate(id) {
        panels.forEach(p => p.classList.toggle('active', p.id === id));
        tabs.forEach(t => {
            const selected = t.getAttribute('href') === `#${id}`;
            t.setAttribute('aria-selected', selected ? 'true' : 'false');
            t.classList.toggle('current', selected);
        });
    }

    function getIdFromHash(hash) {
        return (hash && hash.startsWith('#')) ? hash.slice(1) : 'overview';
    }

    activate(getIdFromHash(window.location.hash));

    nav.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link || !nav.contains(link)) return;
        e.preventDefault();
        const id = link.getAttribute('href').replace('#', '');
        history.pushState(null, '', `#${id}`);
        activate(id);
    });

    window.addEventListener('hashchange', () => {
        activate(getIdFromHash(window.location.hash));
    });
})();

// Replace the floating quick menu script with scroll-to-top behavior
(function () {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;
    const showAt = 300;

    function onScroll() {
        if (window.scrollY > showAt) {
            btn.classList.remove('hide');
        } else {
            btn.classList.add('hide');
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();