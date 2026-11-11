document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const header = document.getElementById('header');
    const nav = document.getElementById('navLinks');
    const menuButton = document.getElementById('menuToggle');
    const navLinks = nav ? [...nav.querySelectorAll('.nav-link')] : [];
    const progress = document.getElementById('progress');

    // Restore the existing persisted theme control.
    const themeButton = document.getElementById('themeToggle');
    const themeLabel = themeButton?.querySelector('.theme-label');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const setTheme = (dark) => {
        root.classList.toggle('dark', dark);
        if (themeMeta) themeMeta.content = dark ? '#222222' : '#FFFFFF';
        themeButton?.setAttribute('aria-pressed', String(dark));
        themeButton?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
        if (themeLabel) themeLabel.textContent = dark ? 'Light' : 'Dark';
        try { localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light'); } catch (_) { }
    };
    let savedTheme = 'dark';
    try { savedTheme = localStorage.getItem('portfolio-theme') || 'dark'; } catch (_) { }
    setTheme(savedTheme === 'dark');
    themeButton?.addEventListener('click', () => setTheme(!root.classList.contains('dark')));

    // Show a simple initials fallback if the portrait fails to load.
    const portrait = document.getElementById('portraitImg');
    const portraitFallback = document.getElementById('portraitFallback');
    if (portrait && portraitFallback) {
        const showFallback = () => { portrait.hidden = true; portraitFallback.style.display = 'grid'; };
        portrait.addEventListener('error', showFallback, { once: true });
        if (portrait.complete && portrait.naturalWidth === 0) showFallback();
    }

    // Keep the compact mobile menu keyboard and touch friendly.
    const setMenu = (open) => {
        nav?.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
        menuButton?.setAttribute('aria-expanded', String(open));
        menuButton?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuButton?.addEventListener('click', () => setMenu(!nav?.classList.contains('open')));
    navLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('click', (event) => {
        if (nav?.classList.contains('open') && !nav.contains(event.target) && !menuButton?.contains(event.target)) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nav?.classList.contains('open')) {
            setMenu(false);
            menuButton?.focus();
        }
    });
    window.matchMedia('(min-width: 721px)').addEventListener?.('change', event => {
        if (event.matches) setMenu(false);
    });

    // Keep the active state in sync with the sections represented in the menu.
    let scrollQueued = false;
    const updateScrollState = () => {
        const sections = [...document.querySelectorAll('main section[id]')];
        let current = 'home';
        for (const section of sections) {
            if (section.getBoundingClientRect().top <= window.innerHeight * 0.36) current = section.id;
        }
        navLinks.forEach(link => {
            const active = link.getAttribute('href') === `#${current}`;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
        const total = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.width = `${total > 0 ? Math.min(100, Math.max(0, window.scrollY / total * 100)) : 0}%`;
        header?.classList.toggle('scrolled', window.scrollY > 10);
        scrollQueued = false;
    };
    const queueScrollState = () => {
        if (!scrollQueued) {
            scrollQueued = true;
            window.requestAnimationFrame(updateScrollState);
        }
    };
    window.addEventListener('scroll', queueScrollState, { passive: true });
    window.addEventListener('resize', queueScrollState, { passive: true });
    updateScrollState();

    // Reveal content as it enters view; content remains visible without the API.
    const revealItems = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const observer = new IntersectionObserver((entries, instance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    instance.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        revealItems.forEach(item => observer.observe(item));
    } else {
        revealItems.forEach(item => item.classList.add('visible'));
    }

    // The learning loop updates one concise panel without moving the layout.
    const workflowSteps = [...document.querySelectorAll('.workflow-step')];
    const workflowTitle = document.getElementById('workflowTitle');
    const workflowCopy = document.getElementById('workflowCopy');
    workflowSteps.forEach(button => button.addEventListener('click', () => {
        workflowSteps.forEach(step => {
            const selected = step === button;
            step.classList.toggle('active', selected);
            step.setAttribute('aria-pressed', String(selected));
        });
        if (workflowTitle) workflowTitle.textContent = button.dataset.title || '';
        if (workflowCopy) workflowCopy.textContent = button.dataset.copy || '';
    }));

    // Filter projects and announce the result count to assistive technology.
    const filters = [...document.querySelectorAll('.filter')];
    const projectCards = [...document.querySelectorAll('.project-card')];
    const filterStatus = document.getElementById('filterStatus');
    filters.forEach(button => button.addEventListener('click', () => {
        const category = button.dataset.filter || 'all';
        let visibleCount = 0;
        filters.forEach(filter => {
            const selected = filter === button;
            filter.classList.toggle('active', selected);
            filter.setAttribute('aria-pressed', String(selected));
        });
        projectCards.forEach(card => {
            const visible = category === 'all' || card.dataset.category === category;
            card.classList.toggle('is-hidden', !visible);
            if (visible) visibleCount += 1;
        });
        const projectEmpty = document.getElementById('projectEmpty');
        if (projectEmpty) projectEmpty.hidden = visibleCount > 0;
        if (filterStatus) filterStatus.textContent = `${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'} shown`;
    }));

    // This form opens a prefilled email draft; it does not send or store data.
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    const formFields = [
        { input: document.getElementById('contactName'), error: document.getElementById('nameError'), emptyMessage: 'Enter your name.' },
        { input: document.getElementById('contactEmail'), error: document.getElementById('emailError'), emptyMessage: 'Enter your email address.' },
        { input: document.getElementById('contactMessage'), error: document.getElementById('messageError'), emptyMessage: 'Add a few details about your project.' }
    ];
    const clearFieldError = ({ input, error }) => {
        input?.removeAttribute('aria-invalid');
        if (error) { error.hidden = true; error.textContent = ''; }
    };
    formFields.forEach(field => field.input?.addEventListener('input', () => {
        const value = field.input.value.trim();
        if (value && field.input.validity.valid) clearFieldError(field);
        if (formStatus) { formStatus.textContent = ''; delete formStatus.dataset.state; }
    }));
    contactForm?.addEventListener('submit', event => {
        event.preventDefault();
        const invalidField = formFields.find(({ input }) => !input?.value.trim() || !input.validity.valid);
        if (invalidField) {
            const { input, error, emptyMessage } = invalidField;
            input.setAttribute('aria-invalid', 'true');
            if (error) {
                error.textContent = input.value.trim() ? 'Enter a valid email address.' : emptyMessage;
                error.hidden = false;
            }
            input.focus();
            if (formStatus) {
                formStatus.dataset.state = 'error';
                formStatus.textContent = 'Check the highlighted field and try again.';
            }
            return;
        }
        const name = formFields[0].input.value.trim();
        const email = formFields[1].input.value.trim();
        const message = formFields[2].input.value.trim();
        const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
        formStatus.dataset.state = 'info';
        formStatus.textContent = 'Your email app should open with a draft. This page does not send the message.';
        window.location.href = `mailto:prajwalu143@gmail.com?subject=${subject}&body=${body}`;
    });

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
});
