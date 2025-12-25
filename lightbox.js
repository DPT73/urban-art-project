// Lightbox functionality
class Lightbox {
    constructor() {
        this.modal = document.querySelector('.lightbox-modal');
        this.image = document.querySelector('.lightbox-image');
        this.caption = document.querySelector('.lightbox-caption');
        this.closeBtn = document.querySelector('.lightbox-close');
        this.prevBtn = document.querySelector('.lightbox-prev');
        this.nextBtn = document.querySelector('.lightbox-next');

        this.images = [];
        this.currentIndex = 0;

        this.init();
    }

    init() {
        // Get all clickable images (gallery and product images)
        this.collectImages();

        // Event listeners
        this.closeBtn.addEventListener('click', () => this.close());
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());

        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('active')) return;

            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });

        // Touch support for swipe
        this.addSwipeSupport();
    }

    collectImages() {
        // Gallery images
        const galleryImages = document.querySelectorAll('.gallery-item img');
        galleryImages.forEach((img, index) => {
            this.images.push({
                src: img.src,
                alt: img.alt,
                caption: img.closest('.gallery-item').querySelector('h3')?.textContent || ''
            });

            img.style.cursor = 'pointer';
            img.addEventListener('click', () => this.open(index));
        });

        // Product images
        const startIndex = this.images.length;
        const productImages = document.querySelectorAll('.product-image img');
        productImages.forEach((img, index) => {
            this.images.push({
                src: img.src,
                alt: img.alt,
                caption: img.closest('.product-card').querySelector('h3')?.textContent || ''
            });

            img.style.cursor = 'pointer';
            img.addEventListener('click', () => this.open(startIndex + index));
        });

        // Hero bust image
        const heroBust = document.querySelector('.hero-bust');
        if (heroBust) {
            const heroIndex = this.images.length;
            this.images.push({
                src: heroBust.src,
                alt: heroBust.alt,
                caption: 'Buste Monumental'
            });

            heroBust.style.cursor = 'pointer';
            heroBust.addEventListener('click', (e) => {
                e.preventDefault();
                this.open(heroIndex);
            });
        }
    }

    open(index) {
        this.currentIndex = index;
        this.updateImage();
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateImage();
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateImage();
    }

    updateImage() {
        const current = this.images[this.currentIndex];
        this.image.src = current.src;
        this.image.alt = current.alt;
        this.caption.textContent = current.caption;

        // Show/hide navigation buttons
        this.prevBtn.style.display = this.images.length > 1 ? 'flex' : 'none';
        this.nextBtn.style.display = this.images.length > 1 ? 'flex' : 'none';
    }

    addSwipeSupport() {
        let touchStartX = 0;
        let touchEndX = 0;

        this.modal.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.modal.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        const handleSwipe = () => {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next image
                    this.next();
                } else {
                    // Swipe right - previous image
                    this.prev();
                }
            }
        };

        this.handleSwipe = handleSwipe;
    }
}

// Initialize lightbox when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.lightbox = new Lightbox();
});
