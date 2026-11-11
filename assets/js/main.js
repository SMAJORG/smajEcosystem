/**
 * SMAJ Ecosystem - Main JavaScript
 * Startup Technology Company / Venture Builder
 */

document.addEventListener('DOMContentLoaded', function () {
    initPreloader();
    initScrollAnimations();
    initSmoothScroll();
    initProjectCarousel();
    initCounters();
    initScrollTop();
    initNewsletterForms();
    initFormPersistence();
    initCookieConsent();
    setActiveMenuItem();
});

/**
 * Preloader
 */
function initPreloader() {
    const preloader = document.querySelector('.preloader');

    if (!preloader) return;

    window.addEventListener('load', function () {
        setTimeout(function () {
            preloader.classList.add('hidden');
        }, 900);
    });
}

/**
 * Scroll Animations
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    if (!animatedElements.length) return;

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.12
    });

    animatedElements.forEach(function (element) {
        observer.observe(element);
    });
}

/**
 * Smooth Scroll
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(function (link) {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            if (!href || href === '#') return;

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();

                const headerHeight = document.querySelector('.header')?.offsetHeight || 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Project / Venture Carousel
 */
function initProjectCarousel() {
    const carousel = document.querySelector('.projects-carousel');

    if (!carousel) return;

    const slides = carousel.querySelectorAll('.project-card');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');

    if (!slides.length) return;

    let currentSlide = 0;
    const totalSlides = slides.length;

    function showSlide(index) {
        slides.forEach(function (slide, i) {
            slide.style.display = i === index ? 'block' : 'none';
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        showSlide(currentSlide);
    }

    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    setInterval(nextSlide, 5000);
    showSlide(currentSlide);
}

/**
 * Counter Animation
 */
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');

    if (!counters.length) return;

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target'), 10);

                if (isNaN(target)) return;

                const duration = 1800;
                const increment = target / (duration / 16);
                let current = 0;

                function updateCounter() {
                    current += increment;

                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                }

                updateCounter();
                observer.unobserve(counter);
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    });

    counters.forEach(function (counter) {
        observer.observe(counter);
    });
}

/**
 * Scroll To Top
 */
function initScrollTop() {
    const scrollTopBtn = document.querySelector('.scroll-top');

    if (!scrollTopBtn) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });

    scrollTopBtn.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Form Validation
 */
function validateForm(formId) {
    const form = document.getElementById(formId);

    if (!form) return false;

    const inputs = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(function (input) {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    return isValid;
}

/**
 * Newsletter Forms
 */
function initNewsletterForms() {
    const forms = document.querySelectorAll('[data-newsletter-form]');

    forms.forEach(function (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            submitNewsletterForm(form);
        });
    });
}

async function submitNewsletterForm(form) {
    const emailField = form.querySelector('input[type="email"]');
    const submitButton = form.querySelector('[type="submit"]');
    const status = form.querySelector('[data-newsletter-status]');
    const endpoint = form.getAttribute('action');

    if (!emailField || !isValidEmail(emailField.value.trim())) {
        setNewsletterStatus(status, 'Please enter a valid email address.', 'error');
        emailField?.focus();
        return;
    }

    if (!endpoint) {
        setNewsletterStatus(status, 'Subscription service is not configured yet.', 'error');
        return;
    }

    setNewsletterStatus(status, 'Subscribing...', 'info');
    setNewsletterButtonLoading(submitButton, true);

    try {
        const formData = new FormData(form);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.fromEntries(formData.entries()))
        });

        if (!response.ok) {
            throw new Error('Subscription failed.');
        }

        form.reset();
        clearSmajPersistedForm(form);
        setNewsletterStatus(status, 'Subscribed successfully. Thank you for following SMAJ Ecosystem.', 'success');
    } catch (error) {
        console.error(error);
        setNewsletterStatus(status, 'Could not subscribe right now. Please try again in a moment.', 'error');
    } finally {
        setNewsletterButtonLoading(submitButton, false);
    }
}

function setNewsletterStatus(status, message, type) {
    if (!status) return;
    if (status.feedbackPopupTimer) window.clearTimeout(status.feedbackPopupTimer);
    status.textContent = message;
    status.dataset.status = type;
    status.classList.toggle('feedback-popup', Boolean(message));
    status.classList.toggle('feedback-popup-visible', Boolean(message));

    if (!message) return;
    status.feedbackPopupTimer = window.setTimeout(function () {
        status.classList.remove('feedback-popup-visible');
        window.setTimeout(function () {
            if (!status.classList.contains('feedback-popup-visible')) {
                status.classList.remove('feedback-popup');
                status.textContent = '';
                status.removeAttribute('data-status');
            }
        }, 200);
    }, 3000);
}

function setNewsletterButtonLoading(button, isLoading) {
    if (!button) return;

    if (!button.dataset.defaultText) {
        button.dataset.defaultText = button.textContent;
    }

    button.disabled = isLoading;
    button.textContent = isLoading ? 'Subscribing...' : button.dataset.defaultText;
}

/**
 * Form Draft Persistence
 */
function initFormPersistence() {
    const forms = document.querySelectorAll('[data-persist-form]');

    if (!forms.length || !supportsLocalStorage()) return;

    forms.forEach(function (form) {
        restorePersistedForm(form);

        ['input', 'change'].forEach(function (eventName) {
            form.addEventListener(eventName, function (event) {
                if (shouldPersistField(event.target)) {
                    savePersistedForm(form);
                }
            });
        });
    });
}

function savePersistedForm(form) {
    const storageKey = getPersistedFormKey(form);
    const data = {};
    const fields = form.querySelectorAll('input, textarea, select');

    fields.forEach(function (field) {
        if (!shouldPersistField(field) || !field.name) return;

        if (field.type === 'checkbox') {
            data[field.name] = field.checked;
            return;
        }

        if (field.type === 'radio') {
            if (field.checked) data[field.name] = field.value;
            return;
        }

        data[field.name] = field.value;
    });

    localStorage.setItem(storageKey, JSON.stringify(data));
}

function restorePersistedForm(form) {
    const storageKey = getPersistedFormKey(form);
    let data = {};

    try {
        data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (error) {
        localStorage.removeItem(storageKey);
        return;
    }

    Object.keys(data).forEach(function (name) {
        const fields = Array.from(form.elements).filter(function (field) {
            return field.name === name && shouldPersistField(field);
        });

        fields.forEach(function (field) {
            if (field.type === 'checkbox') {
                field.checked = Boolean(data[name]);
                return;
            }

            if (field.type === 'radio') {
                field.checked = field.value === data[name];
                return;
            }

            field.value = data[name];
        });
    });
}

function clearSmajPersistedForm(form) {
    if (!form || !supportsLocalStorage()) return;
    localStorage.removeItem(getPersistedFormKey(form));
}

function getPersistedFormKey(form) {
    return `smaj:${form.dataset.persistForm || form.id || 'form'}`;
}

function shouldPersistField(field) {
    if (!field || !field.matches || !field.matches('input, textarea, select')) return false;

    const blockedTypes = ['file', 'password', 'submit', 'button', 'reset', 'hidden'];
    return !blockedTypes.includes((field.type || '').toLowerCase());
}

function supportsLocalStorage() {
    try {
        const testKey = 'smaj:storage-test';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        return false;
    }
}

window.clearSmajPersistedForm = clearSmajPersistedForm;

/**
 * Cookie Consent
 */
function initCookieConsent() {
    if (!supportsLocalStorage()) return;
    if (localStorage.getItem('smajCookieConsent')) return;

    const banner = document.createElement('div');
    banner.className = 'cookie-consent cookie-consent-enter';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = `
        <div class="cookie-consent-text">
            <p>We use cookies to improve your experience, analyze traffic, and support website functionality.</p>
            <a href="/privacy-policy/">Privacy Policy</a>
        </div>
        <div class="cookie-consent-actions">
            <button type="button" class="btn cookie-btn cookie-btn-decline" data-cookie-choice="declined">Decline</button>
            <button type="button" class="btn cookie-btn cookie-btn-accept" data-cookie-choice="accepted">Accept</button>
        </div>
    `;

    document.body.appendChild(banner);

    window.setTimeout(function () {
        banner.classList.remove('cookie-consent-enter');
        banner.classList.add('cookie-consent-visible');
    }, 1100);

    banner.querySelectorAll('[data-cookie-choice]').forEach(function (button) {
        button.addEventListener('click', function () {
            localStorage.setItem('smajCookieConsent', button.dataset.cookieChoice);
            banner.classList.add('cookie-consent-hidden');

            window.setTimeout(function () {
                banner.remove();
            }, 220);
        });
    });
}

/**
 * Email Validation
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Active Menu Item
 */
function setActiveMenuItem() {
    const currentPath = normalizeMenuPath(window.location.pathname);

    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

    navLinks.forEach(function (link) {
        const href = normalizeMenuPath(link.getAttribute('href'));

        link.classList.remove('active');

        if (href === currentPath) {
            link.classList.add('active');
        }
    });
}

function normalizeMenuPath(path) {
    if (!path || path === 'index.html') return '/';

    const legacyMap = {
        'about.html': '/about/',
        'ventures.html': '/ventures/',
        'projects.html': '/ventures/',
        'partnerships.html': '/partnerships/',
        'insights.html': '/insights/',
        'contact.html': '/contact/'
    };

    if (legacyMap[path]) return legacyMap[path];

    if (/^https?:\/\//.test(path)) {
        try {
            path = new URL(path).pathname;
        } catch (error) {
            return path;
        }
    }

    if (!path.startsWith('/')) path = `/${path}`;
    if (path.endsWith('/index.html')) path = path.replace(/index\.html$/, '');
    if (path.endsWith('.html')) path = legacyMap[path.slice(1)] || path;
    if (!path.endsWith('/')) path = `${path}/`;

    return path;
}

// Floating contact widget. Configure Telegram only with the verified private account.
document.addEventListener('DOMContentLoaded', function initFloatingContact() {
    if (/^\/contact(?:\/|$|\.html)/.test(window.location.pathname)) return;
    const telegramContactUsername = 'SMAJEcosystemOfficial'; // Verified private-contact username only.
    const host = document.createElement('div');
    host.id = 'smaj-contact-widget';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
        <style>
            :host { position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: calc(96px + env(safe-area-inset-bottom)); z-index: 1000; display: flex; flex-direction: column; gap: 12px; }
            * { box-sizing: border-box; }
            .contact-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; padding: 0; border: 0; border-radius: 50%; color: white; box-shadow: 0 3px 12px #0003; text-decoration: none; }
            .contact-icon:focus-visible { outline: 3px solid #17212b; outline-offset: 4px; }
            .call { background: #168744; }
            .telegram { background: #0088cc; }
            .telegram:disabled { cursor: not-allowed; }
            svg { width: 26px; height: 26px; fill: currentColor; }
        </style>
        <a class="contact-icon call" href="tel:+14065059434" aria-label="Call SMAJ at +1 406 505 9434" title="Call SMAJ: +1 406 505 9434">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/></svg>
        </a>
        <button class="contact-icon telegram" type="button" disabled aria-label="Telegram private chat unavailable until verified" title="Telegram private chat unavailable until verified">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.8 4.6-3.3 15.5c-.25 1.1-.9 1.37-1.82.85l-5.03-3.71-2.43 2.34c-.27.27-.5.5-1.03.5l.36-5.1 9.28-8.38c.4-.36-.09-.56-.62-.2L5.74 13.62.8 12.07c-1.08-.34-1.1-1.08.23-1.6L20.3 3.04c.9-.33 1.69.2 1.4 1.56Z"/></svg>
        </button>`;
    if (telegramContactUsername) {
        const button = root.querySelector('.telegram');
        const chat = document.createElement('a');
        chat.className = button.className;
        chat.innerHTML = button.innerHTML;
        chat.setAttribute('aria-label', 'Message SMAJ privately on Telegram');
        chat.title = 'Message SMAJ privately on Telegram';
        chat.href = `https://t.me/${encodeURIComponent(telegramContactUsername)}`;
        chat.target = '_blank';
        chat.rel = 'noopener noreferrer';
        button.replaceWith(chat);
    }
    document.body.appendChild(host);

    // Reserve the lower corner for the existing chat launcher. If Tawk expands,
    // move this widget beside or above its frame without changing Tawk itself.
    function positionAroundChat() {
        host.style.right = '';
        host.style.bottom = '';
        const widget = host.getBoundingClientRect();
        const frames = document.querySelectorAll('iframe[src*="tawk.to"], iframe[title*="chat widget" i]');
        for (const frame of frames) {
            const chat = frame.getBoundingClientRect();
            if (!chat.width || !chat.height || getComputedStyle(frame).visibility === 'hidden') continue;
            if (widget.right <= chat.left || widget.left >= chat.right || widget.bottom <= chat.top || widget.top >= chat.bottom) continue;
            if (chat.left >= widget.width + 24) {
                host.style.right = `${window.innerWidth - chat.left + 12}px`;
            } else if (chat.top >= widget.height + 24) {
                host.style.bottom = `${window.innerHeight - chat.top + 12}px`;
            }
        }
    }
    let positionPending = false;
    function schedulePosition() {
        if (positionPending) return;
        positionPending = true;
        requestAnimationFrame(() => {
            positionPending = false;
            positionAroundChat();
        });
    }
    new ResizeObserver(schedulePosition).observe(host);
    const chatObserver = new MutationObserver(records => {
        if (records.some(record => record.target !== host)) schedulePosition();
    });
    chatObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    window.addEventListener('resize', schedulePosition);
    schedulePosition();
});
