// Shopping Cart Management
class ShoppingCart {
    constructor() {
        this.items = this.loadCart();
        this.updateCartUI();
    }

    // Load cart from localStorage
    loadCart() {
        const saved = localStorage.getItem('urbanArtCart');
        return saved ? JSON.parse(saved) : [];
    }

    // Save cart to localStorage
    saveCart() {
        localStorage.setItem('urbanArtCart', JSON.stringify(this.items));
    }

    // Add item to cart
    addItem(product) {
        const existingItem = this.items.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                description: product.description,
                image: product.image,
                quantity: 1
            });
        }

        this.saveCart();
        this.updateCartUI();
        this.showNotification(product.name + ' ajouté au panier');
    }

    // Remove item from cart
    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartUI();
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartUI();
            }
        }
    }

    // Get total price
    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Get total items count
    getItemCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    }

    // Clear cart
    clear() {
        this.items = [];
        this.saveCart();
        this.updateCartUI();
    }

    // Update cart UI (badge, etc.)
    updateCartUI() {
        const cartBadge = document.querySelector('.cart-badge');
        const cartCount = document.querySelector('.cart-count');
        const count = this.getItemCount();

        if (cartBadge) {
            cartBadge.textContent = count;
            cartBadge.style.display = count > 0 ? 'block' : 'none';
        }

        if (cartCount) {
            cartCount.textContent = count;
        }

        // Update cart modal if open
        this.updateCartModal();
    }

    // Create cart item element (safe DOM creation)
    createCartItemElement(item) {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.dataset.id = item.id;

        // Image
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.className = 'cart-item-image';

        // Info section
        const info = document.createElement('div');
        info.className = 'cart-item-info';

        const title = document.createElement('h4');
        title.textContent = item.name;

        const price = document.createElement('p');
        price.className = 'cart-item-price';
        price.textContent = item.price.toFixed(2) + '€';

        info.appendChild(title);
        info.appendChild(price);

        // Controls section
        const controls = document.createElement('div');
        controls.className = 'cart-item-controls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantity-btn minus';
        minusBtn.textContent = '−';
        minusBtn.onclick = () => this.updateQuantity(item.id, item.quantity - 1);

        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'quantity';
        quantitySpan.textContent = item.quantity;

        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantity-btn plus';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => this.updateQuantity(item.id, item.quantity + 1);

        controls.appendChild(minusBtn);
        controls.appendChild(quantitySpan);
        controls.appendChild(plusBtn);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', 'Supprimer');
        removeBtn.onclick = () => this.removeItem(item.id);

        // Assemble
        cartItem.appendChild(img);
        cartItem.appendChild(info);
        cartItem.appendChild(controls);
        cartItem.appendChild(removeBtn);

        return cartItem;
    }

    // Update cart modal content
    updateCartModal() {
        const cartItems = document.querySelector('.cart-items');
        const cartTotal = document.querySelector('.cart-total-amount');
        const emptyCart = document.querySelector('.empty-cart');
        const checkoutBtn = document.querySelector('.checkout-btn');

        if (!cartItems) return;

        // Clear existing items
        cartItems.textContent = '';

        if (this.items.length === 0) {
            if (emptyCart) emptyCart.style.display = 'block';
            if (checkoutBtn) checkoutBtn.disabled = true;
            if (cartTotal) cartTotal.textContent = '0.00€';
            return;
        }

        if (emptyCart) emptyCart.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = false;

        // Add items using safe DOM methods
        this.items.forEach(item => {
            const itemElement = this.createCartItemElement(item);
            cartItems.appendChild(itemElement);
        });

        if (cartTotal) {
            cartTotal.textContent = this.getTotal().toFixed(2) + '€';
        }
    }

    // Show notification
    showNotification(message) {
        // Remove existing notification
        const existing = document.querySelector('.cart-notification');
        if (existing) existing.remove();

        // Create new notification
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Open cart modal
    openCart() {
        const modal = document.querySelector('.cart-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateCartModal();
        }
    }

    // Close cart modal
    closeCart() {
        const modal = document.querySelector('.cart-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Checkout with Stripe
    async checkout() {
        if (this.items.length === 0) {
            alert('Votre panier est vide');
            return;
        }

        try {
            // Show loading state
            const checkoutBtn = document.querySelector('.checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'Chargement...';
            }

            // Get Stripe publishable key
            const configResponse = await fetch('/api/config');
            const { publishableKey } = await configResponse.json();

            // Create checkout session
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: this.items
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la création de la session de paiement');
            }

            const { url } = await response.json();

            // Redirect to Stripe Checkout
            window.location.href = url;

        } catch (error) {
            console.error('Checkout error:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');

            // Reset button
            const checkoutBtn = document.querySelector('.checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'Passer au paiement';
            }
        }
    }
}

// Initialize cart
const cart = new ShoppingCart();
