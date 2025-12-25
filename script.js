/**
 * @fileoverview Main site interactions for Urban Art e-commerce platform.
 * Handles navigation, forms, smooth scrolling, and buy button functionality.
 * @author Urban Art Team
 * @version 2.0.0
 */

'use strict';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** @type {Object} Site configuration constants */
const SITE_CONFIG = Object.freeze({
    SCROLL_OFFSET: 60,
    NAVBAR_SCROLL_THRESHOLD: 100,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    MESSAGE_MIN_LENGTH: 10,
    MESSAGE_MAX_LENGTH: 2000
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates an email address format.
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return SITE_CONFIG.EMAIL_REGEX.test(email.trim());
}

/**
 * Validates a name string.
 * @param {string} name - Name to validate
 * @returns {boolean} True if name is valid
 */
function isValidName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
        trimmed.length >= SITE_CONFIG.NAME_MIN_LENGTH &&
        trimmed.length <= SITE_CONFIG.NAME_MAX_LENGTH
    );
}

/**
 * Validates a message string.
 * @param {string} message - Message to validate
 * @returns {boolean} True if message is valid
 */
function isValidMessage(message) {
    if (!message || typeof message !== 'string') return false;
    const trimmed = message.trim();
    return (
        trimmed.length >= SITE_CONFIG.MESSAGE_MIN_LENGTH &&
        trimmed.length <= SITE_CONFIG.MESSAGE_MAX_LENGTH
    );
}

/**
 * Sanitizes a string by trimming whitespace.
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim();
}

/**
 * Extracts numeric price from a price string.
 * @param {string} priceText - Price text (e.g., "150 €" or "150€")
 * @returns {number} Numeric price or 0 if invalid
 */
function extractPrice(priceText) {
    if (!priceText || typeof priceText !== 'string') return 0;
    const cleaned = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
    const price = parseFloat(cleaned);
    return isNaN(price) ? 0 : price;
}

/**
 * Generates a URL-safe ID from a product name.
 * @param {string} name - Product name
 * @returns {string} URL-safe ID
 */
function generateProductId(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ============================================================================
// NAVIGATION
// ============================================================================

/**
 * Initializes the mobile navigation toggle functionality.
 */
function initMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');

        // Update ARIA attributes
        const isExpanded = navMenu.classList.contains('active');
        hamburger.setAttribute('aria-expanded', String(isExpanded));
    });

    // Close mobile menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });
}

/**
 * Initializes smooth scrolling for anchor links.
 */
function initSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip if just "#"
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const targetPosition = target.offsetTop - SITE_CONFIG.SCROLL_OFFSET;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initializes navbar background change on scroll.
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let ticking = false;

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                if (window.scrollY > SITE_CONFIG.NAVBAR_SCROLL_THRESHOLD) {
                    navbar.style.background = 'rgba(26, 26, 26, 0.98)';
                } else {
                    navbar.style.background = 'linear-gradient(135deg, #1e1e1e 0%, #0a0a0a 100%)';
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ============================================================================
// PRODUCT HANDLING
// ============================================================================

/**
 * Extracts product data from a product card element.
 * @param {HTMLElement} productCard - Product card DOM element
 * @returns {Object|null} Product data object or null if invalid
 */
function extractProductData(productCard) {
    if (!productCard) return null;

    const nameEl = productCard.querySelector('h3');
    const priceEl = productCard.querySelector('.product-price');
    const descEl = productCard.querySelector('.product-description');
    const imageEl = productCard.querySelector('.product-image img');

    if (!nameEl || !priceEl) return null;

    const name = sanitizeInput(nameEl.textContent);
    const price = extractPrice(priceEl.textContent);

    if (!name || price <= 0) return null;

    return {
        id: generateProductId(name),
        name: name,
        price: price,
        description: descEl ? sanitizeInput(descEl.textContent) : '',
        image: imageEl ? imageEl.src : ''
    };
}

/**
 * Initializes buy button click handlers.
 */
function initBuyButtons() {
    const buyButtons = document.querySelectorAll('.buy-button');

    buyButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (this.disabled) return;

            const productCard = this.closest('.product-card');
            if (!productCard) return;

            const product = extractProductData(productCard);

            if (product && typeof cart !== 'undefined') {
                cart.addItem(product);

                // Visual feedback
                this.classList.add('clicked');
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 200);
            }
        });
    });
}

// ============================================================================
// CONTACT FORM
// ============================================================================

/**
 * Validates contact form data.
 * @param {Object} data - Form data object
 * @param {string} data.name - Contact name
 * @param {string} data.email - Contact email
 * @param {string} data.message - Contact message
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateContactForm(data) {
    const errors = [];

    if (!isValidName(data.name)) {
        errors.push('Veuillez entrer un nom valide (2-100 caractères)');
    }

    if (!isValidEmail(data.email)) {
        errors.push('Veuillez entrer une adresse email valide');
    }

    if (!isValidMessage(data.message)) {
        errors.push('Veuillez entrer un message (10-2000 caractères)');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Shows form validation errors to the user.
 * @param {HTMLFormElement} form - Form element
 * @param {string[]} errors - Array of error messages
 */
function showFormErrors(form, errors) {
    // Remove existing error container
    const existingErrors = form.querySelector('.form-errors');
    if (existingErrors) existingErrors.remove();

    if (errors.length === 0) return;

    const errorContainer = document.createElement('div');
    errorContainer.className = 'form-errors';
    errorContainer.setAttribute('role', 'alert');

    errors.forEach(error => {
        const errorP = document.createElement('p');
        errorP.className = 'form-error';
        errorP.textContent = error;
        errorContainer.appendChild(errorP);
    });

    form.insertBefore(errorContainer, form.firstChild);
}

/**
 * Initializes contact form submission handling.
 */
function initContactForm() {
    const contactForm = document.querySelector('.contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const nameInput = this.querySelector('input[type="text"]');
        const emailInput = this.querySelector('input[type="email"]');
        const messageInput = this.querySelector('textarea');

        if (!nameInput || !emailInput || !messageInput) return;

        const formData = {
            name: sanitizeInput(nameInput.value),
            email: sanitizeInput(emailInput.value),
            message: sanitizeInput(messageInput.value)
        };

        const validation = validateContactForm(formData);

        if (!validation.valid) {
            showFormErrors(this, validation.errors);
            return;
        }

        // Clear any previous errors
        showFormErrors(this, []);

        // Show success message
        // In production, this would send data to a backend API
        showSuccessMessage(this, 'Message envoyé avec succès !');
        this.reset();
    });
}

/**
 * Shows a success message after form submission.
 * @param {HTMLFormElement} form - Form element
 * @param {string} message - Success message
 */
function showSuccessMessage(form, message) {
    // Remove existing success message
    const existingSuccess = form.querySelector('.form-success');
    if (existingSuccess) existingSuccess.remove();

    const successDiv = document.createElement('div');
    successDiv.className = 'form-success';
    successDiv.setAttribute('role', 'status');
    successDiv.textContent = message;

    form.insertBefore(successDiv, form.firstChild);

    // Remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes all site functionality when DOM is ready.
 */
function initSite() {
    initMobileNav();
    initSmoothScrolling();
    initNavbarScroll();
    initBuyButtons();
    initContactForm();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSite);
} else {
    initSite();
}

// Export for module systems (if used)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isValidEmail,
        isValidName,
        isValidMessage,
        extractPrice,
        generateProductId,
        validateContactForm
    };
}
