// Simple Safari-compatible script
document.addEventListener('DOMContentLoaded', function() {
    console.log('Site loaded');

    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }

    // Smooth Scrolling
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            const target = document.querySelector(href);
            if (target) {
                const offset = 60;
                const targetPosition = target.offsetTop - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Buy Button Click Handler
    const buyButtons = document.querySelectorAll('.buy-button');
    buyButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            if (!this.disabled) {
                const productCard = this.closest('.product-card');
                const productName = productCard.querySelector('h3').textContent;
                const productPriceText = productCard.querySelector('.product-price').textContent;
                const productDescription = productCard.querySelector('.product-description').textContent;
                const productImage = productCard.querySelector('.product-image img').src;

                // Extract numeric price (remove € symbol and convert to number)
                const productPrice = parseFloat(productPriceText.replace('€', '').replace(/\s/g, ''));

                // Generate unique ID from product name
                const productId = productName.toLowerCase().replace(/\s+/g, '-');

                // Add to cart
                cart.addItem({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    description: productDescription,
                    image: productImage
                });
            }
        });
    });

    // Contact Form Submission
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const nameInput = contactForm.querySelector('input[type="text"]');
            const emailInput = contactForm.querySelector('input[type="email"]');
            const messageInput = contactForm.querySelector('textarea');

            if (nameInput && emailInput && messageInput) {
                const name = nameInput.value;
                const email = emailInput.value;
                const message = messageInput.value;

                if (name && email && message) {
                    console.log('Form submitted:', { name: name, email: email, message: message });
                    alert('Message envoyé avec succès !');
                    contactForm.reset();
                } else {
                    alert('Veuillez remplir tous les champs');
                }
            }
        });
    }

    // Navbar background change on scroll
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.style.background = 'rgba(26, 26, 26, 0.98)';
            } else {
                navbar.style.background = 'linear-gradient(135deg, #1e1e1e 0%, #0a0a0a 100%)';
            }
        }
    });

    console.log('Urban Art - Ready');
});
