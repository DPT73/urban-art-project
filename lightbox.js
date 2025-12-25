/**
 * @fileoverview Lightbox functionality for full-screen image viewing.
 * Supports gallery images, product images, and hero images with keyboard
 * and touch navigation.
 * @author Urban Art Team
 * @version 2.0.0
 */

'use strict';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** @type {Object} Lightbox configuration constants */
const LIGHTBOX_CONFIG = Object.freeze({
    SWIPE_THRESHOLD: 50,
    PRELOAD_ADJACENT: true,
    ANIMATION_DURATION: 300
});

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} LightboxImage
 * @property {string} src - Image source URL
 * @property {string} alt - Alt text for accessibility
 * @property {string} caption - Image caption
 */

// ============================================================================
// LIGHTBOX CLASS
// ============================================================================

/**
 * Lightbox class for full-screen image viewing.
 * Provides navigation, keyboard controls, and touch/swipe support.
 */
class Lightbox {
    /**
     * Creates a new Lightbox instance.
     * @throws {Error} If required DOM elements are not found
     */
    constructor() {
        /** @type {HTMLElement|null} */
        this.modal = document.querySelector('.lightbox-modal');

        /** @type {HTMLImageElement|null} */
        this.image = document.querySelector('.lightbox-image');

        /** @type {HTMLElement|null} */
        this.caption = document.querySelector('.lightbox-caption');

        /** @type {HTMLButtonElement|null} */
        this.closeBtn = document.querySelector('.lightbox-close');

        /** @type {HTMLButtonElement|null} */
        this.prevBtn = document.querySelector('.lightbox-prev');

        /** @type {HTMLButtonElement|null} */
        this.nextBtn = document.querySelector('.lightbox-next');

        /** @type {LightboxImage[]} */
        this.images = [];

        /** @type {number} */
        this.currentIndex = 0;

        /** @type {number} */
        this._touchStartX = 0;

        /** @type {boolean} */
        this._isOpen = false;

        // Bound methods for event listener cleanup
        this._boundKeyHandler = this._handleKeyDown.bind(this);
        this._boundTouchStart = this._handleTouchStart.bind(this);
        this._boundTouchEnd = this._handleTouchEnd.bind(this);

        this._init();
    }

    // ========================================================================
    // PRIVATE INITIALIZATION
    // ========================================================================

    /**
     * Initializes the lightbox functionality.
     * @private
     */
    _init() {
        if (!this._validateElements()) {
            return;
        }

        this._collectImages();
        this._setupEventListeners();
    }

    /**
     * Validates that required DOM elements exist.
     * @private
     * @returns {boolean} True if all required elements exist
     */
    _validateElements() {
        if (!this.modal || !this.image || !this.closeBtn) {
            return false;
        }
        return true;
    }

    /**
     * Sets up all event listeners.
     * @private
     */
    _setupEventListeners() {
        // Close button
        this.closeBtn.addEventListener('click', () => this.close());

        // Navigation buttons
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prev());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.next());
        }

        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Keyboard navigation (added when lightbox opens)
        // Touch support
        this._setupTouchSupport();
    }

    /**
     * Sets up touch/swipe support for mobile devices.
     * @private
     */
    _setupTouchSupport() {
        this.modal.addEventListener('touchstart', this._boundTouchStart, { passive: true });
        this.modal.addEventListener('touchend', this._boundTouchEnd, { passive: true });
    }

    /**
     * Handles touch start event.
     * @private
     * @param {TouchEvent} e - Touch event
     */
    _handleTouchStart(e) {
        this._touchStartX = e.changedTouches[0].screenX;
    }

    /**
     * Handles touch end event and determines swipe direction.
     * @private
     * @param {TouchEvent} e - Touch event
     */
    _handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = this._touchStartX - touchEndX;

        if (Math.abs(diff) > LIGHTBOX_CONFIG.SWIPE_THRESHOLD) {
            if (diff > 0) {
                // Swipe left - next image
                this.next();
            } else {
                // Swipe right - previous image
                this.prev();
            }
        }
    }

    /**
     * Handles keyboard navigation.
     * @private
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleKeyDown(e) {
        if (!this._isOpen) return;

        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowLeft':
                this.prev();
                break;
            case 'ArrowRight':
                this.next();
                break;
        }
    }

    // ========================================================================
    // IMAGE COLLECTION
    // ========================================================================

    /**
     * Collects all lightbox-enabled images from the page.
     * @private
     */
    _collectImages() {
        this._collectGalleryImages();
        this._collectProductImages();
        this._collectHeroImage();
    }

    /**
     * Collects images from the gallery section.
     * @private
     */
    _collectGalleryImages() {
        const galleryImages = document.querySelectorAll('.gallery-item img');

        galleryImages.forEach((img, index) => {
            const imageData = this._createImageData(img, '.gallery-item', 'h3');
            this.images.push(imageData);

            this._makeClickable(img, index);
        });
    }

    /**
     * Collects images from product cards.
     * @private
     */
    _collectProductImages() {
        const startIndex = this.images.length;
        const productImages = document.querySelectorAll('.product-image img');

        productImages.forEach((img, index) => {
            const imageData = this._createImageData(img, '.product-card', 'h3');
            this.images.push(imageData);

            this._makeClickable(img, startIndex + index);
        });
    }

    /**
     * Collects the hero bust image.
     * @private
     */
    _collectHeroImage() {
        const heroBust = document.querySelector('.hero-bust');
        if (!heroBust) return;

        const heroIndex = this.images.length;

        this.images.push({
            src: heroBust.src,
            alt: heroBust.alt || 'Buste Monumental',
            caption: 'Buste Monumental'
        });

        heroBust.style.cursor = 'pointer';

        // Handle click on hero bust or its parent link
        const heroBustLink = heroBust.closest('a');
        const target = heroBustLink || heroBust;

        target.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.open(heroIndex);
        });
    }

    /**
     * Creates image data object from an image element.
     * @private
     * @param {HTMLImageElement} img - Image element
     * @param {string} containerSelector - CSS selector for container
     * @param {string} captionSelector - CSS selector for caption element
     * @returns {LightboxImage} Image data object
     */
    _createImageData(img, containerSelector, captionSelector) {
        const container = img.closest(containerSelector);
        const captionEl = container?.querySelector(captionSelector);

        return {
            src: img.src,
            alt: img.alt || '',
            caption: captionEl?.textContent || ''
        };
    }

    /**
     * Makes an image clickable to open the lightbox.
     * @private
     * @param {HTMLImageElement} img - Image element
     * @param {number} index - Index in images array
     */
    _makeClickable(img, index) {
        img.style.cursor = 'pointer';
        img.setAttribute('role', 'button');
        img.setAttribute('tabindex', '0');
        img.setAttribute('aria-label', `Voir l'image en plein écran: ${img.alt || 'Image'}`);

        // Click handler
        img.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.open(index);
        });

        // Keyboard handler for accessibility
        img.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.open(index);
            }
        });
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Opens the lightbox at the specified image index.
     * @param {number} index - Index of image to display
     */
    open(index) {
        if (!this.modal || this.images.length === 0) return;

        // Validate index
        if (index < 0 || index >= this.images.length) {
            index = 0;
        }

        this.currentIndex = index;
        this._updateImage();

        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        this._isOpen = true;

        // Add keyboard listener
        document.addEventListener('keydown', this._boundKeyHandler);

        // Focus management for accessibility
        this.closeBtn.focus();

        // Preload adjacent images
        if (LIGHTBOX_CONFIG.PRELOAD_ADJACENT) {
            this._preloadAdjacentImages();
        }
    }

    /**
     * Closes the lightbox.
     */
    close() {
        if (!this.modal) return;

        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        this._isOpen = false;

        // Remove keyboard listener
        document.removeEventListener('keydown', this._boundKeyHandler);
    }

    /**
     * Navigates to the previous image.
     */
    prev() {
        if (this.images.length <= 1) return;

        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this._updateImage();

        if (LIGHTBOX_CONFIG.PRELOAD_ADJACENT) {
            this._preloadAdjacentImages();
        }
    }

    /**
     * Navigates to the next image.
     */
    next() {
        if (this.images.length <= 1) return;

        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this._updateImage();

        if (LIGHTBOX_CONFIG.PRELOAD_ADJACENT) {
            this._preloadAdjacentImages();
        }
    }

    /**
     * Gets the current image index.
     * @returns {number} Current image index
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * Gets the total number of images.
     * @returns {number} Total image count
     */
    getImageCount() {
        return this.images.length;
    }

    /**
     * Checks if the lightbox is currently open.
     * @returns {boolean} True if lightbox is open
     */
    isOpen() {
        return this._isOpen;
    }

    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================

    /**
     * Updates the displayed image and UI elements.
     * @private
     */
    _updateImage() {
        const current = this.images[this.currentIndex];
        if (!current) return;

        this.image.src = current.src;
        this.image.alt = current.alt;

        if (this.caption) {
            this.caption.textContent = current.caption;
        }

        // Show/hide navigation buttons based on image count
        const showNav = this.images.length > 1;
        if (this.prevBtn) {
            this.prevBtn.style.display = showNav ? 'flex' : 'none';
        }
        if (this.nextBtn) {
            this.nextBtn.style.display = showNav ? 'flex' : 'none';
        }

        // Update counter if exists
        const counter = this.modal.querySelector('.lightbox-counter');
        if (counter) {
            counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
        }
    }

    /**
     * Preloads adjacent images for smoother navigation.
     * @private
     */
    _preloadAdjacentImages() {
        const prevIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        const nextIndex = (this.currentIndex + 1) % this.images.length;

        // Preload previous
        if (this.images[prevIndex]) {
            const prevImg = new Image();
            prevImg.src = this.images[prevIndex].src;
        }

        // Preload next
        if (this.images[nextIndex]) {
            const nextImg = new Image();
            nextImg.src = this.images[nextIndex].src;
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the lightbox when DOM is ready.
 */
function initLightbox() {
    // Only initialize if lightbox elements exist
    if (document.querySelector('.lightbox-modal')) {
        window.lightbox = new Lightbox();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox);
} else {
    initLightbox();
}

// Export for module systems (if used)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Lightbox, LIGHTBOX_CONFIG };
}
