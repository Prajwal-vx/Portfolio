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
        if (themeMeta) themeMeta.content = dark ? '#000000' : '#FFFFFF';
        themeButton?.setAttribute('aria-pressed', String(dark));
        themeButton?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
        if (themeLabel) themeLabel.textContent = dark ? 'Light' : 'Dark';
        try { localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light'); } catch (_) { }
    };
    let savedTheme = 'dark';
    try { savedTheme = localStorage.getItem('portfolio-theme') || 'dark'; } catch (_) { }
    setTheme(savedTheme === 'dark');
    themeButton?.addEventListener('click', () => setTheme(!root.classList.contains('dark')));

    // Keep the decorative canvas lightweight and pause it off-screen.
    const canvas = document.getElementById('particle-canvas');
    const context = canvas?.getContext('2d');
    const hero = document.getElementById('home');
    if (canvas && context && hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let width = 0;
        let height = 0;
        let points = [];
        let frame = 0;
        let inView = true;
        let lastTimestamp = 0;
        const draw = (timestamp) => {
            if (!inView || document.hidden) { frame = 0; lastTimestamp = timestamp; return; }
            const delta = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 16.67, 1.75) : 1;
            lastTimestamp = timestamp;
            context.clearRect(0, 0, width, height);
            points.forEach(point => {
                point.x += point.vx * delta;
                point.y += point.vy * delta;
                if (point.x < 0 || point.x > width) point.vx *= -1;
                if (point.y < 0 || point.y > height) point.vy *= -1;
            });
            for (let i = 0; i < points.length; i += 1) {
                for (let j = i + 1; j < points.length; j += 1) {
                    const dx = points[i].x - points[j].x;
                    const dy = points[i].y - points[j].y;
                    const distance = Math.hypot(dx, dy);
                    if (distance < 130) {
                        const alpha = (1 - distance / 130) * .18;
                        context.strokeStyle = `rgba(140, 185, 204, ${alpha})`;
                        context.beginPath(); context.moveTo(points[i].x, points[i].y); context.lineTo(points[j].x, points[j].y); context.stroke();
                    }
                }
            }
            points.forEach(point => {
                context.fillStyle = 'rgba(140, 185, 204, .62)';
                context.beginPath(); context.arc(point.x, point.y, point.size, 0, Math.PI * 2); context.fill();
            });
            frame = requestAnimationFrame(draw);
        };
        const resize = () => {
            const rect = hero.getBoundingClientRect();
            const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
            width = rect.width; height = rect.height;
            canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            points = Array.from({ length: width < 700 ? 16 : 30 }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .42, vy: (Math.random() - .5) * .42, size: Math.random() * 1.3 + .7 }));
            if (inView && !document.hidden && !frame) frame = requestAnimationFrame(draw);
        };
        window.addEventListener('resize', resize, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
            else if (inView && !frame) frame = requestAnimationFrame(draw);
        });
        if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView && !document.hidden && !frame) frame = requestAnimationFrame(draw);
            else if (!inView && frame) { cancelAnimationFrame(frame); frame = 0; }
        }).observe(hero);
        resize();
    }

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
        if (filterStatus) filterStatus.textContent = `${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'} shown`;
    }));

    // This form opens a prefilled email draft; it does not send or store data.
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    contactForm?.addEventListener('submit', event => {
        event.preventDefault();
        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }
        const nameField = document.getElementById('contactName');
        const emailField = document.getElementById('contactEmail');
        const messageField = document.getElementById('contactMessage');
        const name = nameField.value.trim();
        const email = emailField.value.trim();
        const message = messageField.value.trim();
        const emptyField = !name ? nameField : !email ? emailField : !message ? messageField : null;
        if (emptyField) {
            formStatus.textContent = 'Please complete each field before opening your draft.';
            emptyField.focus();
            return;
        }
        const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
        formStatus.textContent = 'Opening your email app with a draft…';
        window.location.href = `mailto:prajwalu143@gmail.com?subject=${subject}&body=${body}`;
    });

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
});
