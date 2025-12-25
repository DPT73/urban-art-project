/**
 * @fileoverview Shopping cart management for Urban Art e-commerce platform.
 * Handles cart operations, localStorage persistence, and Stripe checkout integration.
 * @author Urban Art Team
 * @version 2.0.0
 */

'use strict';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** @type {Object} Cart configuration constants */
const CART_CONFIG = Object.freeze({
    STORAGE_KEY: 'urbanArtCart',
    MAX_QUANTITY_PER_ITEM: 99,
    MAX_ITEMS: 50,
    NOTIFICATION_DURATION: 3000,
    NOTIFICATION_FADE_DELAY: 300,
    CURRENCY_SYMBOL: '€',
    DECIMAL_PLACES: 2
});

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} CartItem
 * @property {string} id - Unique identifier for the product
 * @property {string} name - Product name
 * @property {number} price - Product price in euros
 * @property {string} [description] - Product description
 * @property {string} [image] - Product image URL
 * @property {number} quantity - Quantity in cart
 */

/**
 * @typedef {Object} Product
 * @property {string} id - Unique identifier for the product
 * @property {string} name - Product name
 * @property {number} price - Product price in euros
 * @property {string} [description] - Product description
 * @property {string} [image] - Product image URL
 */

// ============================================================================
// SHOPPING CART CLASS
// ============================================================================

/**
 * Shopping cart manager class.
 * Handles all cart operations including CRUD, persistence, and UI updates.
 */
class ShoppingCart {
    /**
     * Creates a new ShoppingCart instance.
     * Loads existing cart data from localStorage if available.
     */
    constructor() {
        /** @type {CartItem[]} */
        this.items = this._loadCart();
        this.updateCartUI();
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    /**
     * Loads cart data from localStorage.
     * @private
     * @returns {CartItem[]} Array of cart items or empty array
     */
    _loadCart() {
        try {
            const saved = localStorage.getItem(CART_CONFIG.STORAGE_KEY);
            if (!saved) return [];

            const parsed = JSON.parse(saved);

            // Validate parsed data is an array
            if (!Array.isArray(parsed)) {
                this._clearCorruptedCart();
                return [];
            }

            // Validate and sanitize each item
            return parsed.filter(item => this._isValidCartItem(item));

        } catch (error) {
            this._clearCorruptedCart();
            return [];
        }
    }

    /**
     * Validates a cart item has required properties.
     * @private
     * @param {*} item - Item to validate
     * @returns {boolean} True if item is valid
     */
    _isValidCartItem(item) {
        return (
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            item.id.length > 0 &&
            typeof item.name === 'string' &&
            item.name.length > 0 &&
            typeof item.price === 'number' &&
            item.price > 0 &&
            typeof item.quantity === 'number' &&
            item.quantity > 0 &&
            item.quantity <= CART_CONFIG.MAX_QUANTITY_PER_ITEM
        );
    }

    /**
     * Clears corrupted cart data from localStorage.
     * @private
     */
    _clearCorruptedCart() {
        try {
            localStorage.removeItem(CART_CONFIG.STORAGE_KEY);
        } catch {
            // localStorage might be unavailable
        }
    }

    /**
     * Saves cart to localStorage.
     * @private
     */
    _saveCart() {
        try {
            localStorage.setItem(
                CART_CONFIG.STORAGE_KEY,
                JSON.stringify(this.items)
            );
        } catch (error) {
            // Handle quota exceeded or unavailable localStorage
            this._showNotification('Erreur de sauvegarde du panier', 'error');
        }
    }

    /**
     * Formats a price for display.
     * @private
     * @param {number} price - Price to format
     * @returns {string} Formatted price string
     */
    _formatPrice(price) {
        return price.toFixed(CART_CONFIG.DECIMAL_PLACES) + CART_CONFIG.CURRENCY_SYMBOL;
    }

    /**
     * Finds an item in the cart by ID.
     * @private
     * @param {string} productId - Product ID to find
     * @returns {CartItem|undefined} Found item or undefined
     */
    _findItem(productId) {
        return this.items.find(item => item.id === productId);
    }

    // ========================================================================
    // PUBLIC CART OPERATIONS
    // ========================================================================

    /**
     * Adds a product to the cart.
     * @param {Product} product - Product to add
     * @returns {boolean} True if item was added successfully
     */
    addItem(product) {
        // Validate product
        if (!product || typeof product.id !== 'string' || !product.name) {
            return false;
        }

        const existingItem = this._findItem(product.id);

        if (existingItem) {
            // Check quantity limit
            if (existingItem.quantity >= CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
                this._showNotification(
                    `Quantité maximale atteinte (${CART_CONFIG.MAX_QUANTITY_PER_ITEM})`
                );
                return false;
            }
            existingItem.quantity += 1;
        } else {
            // Check item limit
            if (this.items.length >= CART_CONFIG.MAX_ITEMS) {
                this._showNotification(
                    `Panier limité à ${CART_CONFIG.MAX_ITEMS} articles différents`
                );
                return false;
            }

            this.items.push({
                id: String(product.id),
                name: String(product.name),
                price: Number(product.price) || 0,
                description: product.description ? String(product.description) : '',
                image: product.image ? String(product.image) : '',
                quantity: 1
            });
        }

        this._saveCart();
        this.updateCartUI();
        this._showNotification(product.name + ' ajouté au panier');
        return true;
    }

    /**
     * Removes an item from the cart.
     * @param {string} productId - ID of product to remove
     * @returns {boolean} True if item was removed
     */
    removeItem(productId) {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => item.id !== productId);

        if (this.items.length !== initialLength) {
            this._saveCart();
            this.updateCartUI();
            return true;
        }
        return false;
    }

    /**
     * Updates the quantity of an item in the cart.
     * @param {string} productId - ID of product to update
     * @param {number} quantity - New quantity
     * @returns {boolean} True if quantity was updated
     */
    updateQuantity(productId, quantity) {
        // Validate quantity
        const parsedQuantity = parseInt(quantity, 10);

        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
            return false;
        }

        if (parsedQuantity === 0) {
            return this.removeItem(productId);
        }

        if (parsedQuantity > CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
            this._showNotification(
                `Quantité maximale: ${CART_CONFIG.MAX_QUANTITY_PER_ITEM}`
            );
            return false;
        }

        const item = this._findItem(productId);
        if (item) {
            item.quantity = parsedQuantity;
            this._saveCart();
            this.updateCartUI();
            return true;
        }

        return false;
    }

    /**
     * Calculates the total price of all items in the cart.
     * @returns {number} Total price
     */
    getTotal() {
        return this.items.reduce(
            (total, item) => total + (item.price * item.quantity),
            0
        );
    }

    /**
     * Gets the total count of items in the cart.
     * @returns {number} Total item count
     */
    getItemCount() {
        return this.items.reduce(
            (count, item) => count + item.quantity,
            0
        );
    }

    /**
     * Clears all items from the cart.
     */
    clear() {
        this.items = [];
        this._saveCart();
        this.updateCartUI();
    }

    /**
     * Checks if the cart is empty.
     * @returns {boolean} True if cart has no items
     */
    isEmpty() {
        return this.items.length === 0;
    }

    // ========================================================================
    // UI METHODS
    // ========================================================================

    /**
     * Updates all cart-related UI elements.
     */
    updateCartUI() {
        this._updateBadge();
        this._updateCartModal();
    }

    /**
     * Updates the cart badge with current item count.
     * @private
     */
    _updateBadge() {
        const cartBadge = document.querySelector('.cart-badge');
        const cartCount = document.querySelector('.cart-count');
        const count = this.getItemCount();

        if (cartBadge) {
            cartBadge.textContent = String(count);
            cartBadge.style.display = count > 0 ? 'block' : 'none';
        }

        if (cartCount) {
            cartCount.textContent = String(count);
        }
    }

    /**
     * Creates a cart item DOM element using safe methods.
     * @private
     * @param {CartItem} item - Cart item to render
     * @returns {HTMLElement} Cart item element
     */
    _createCartItemElement(item) {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.dataset.id = item.id;

        // Image
        const img = document.createElement('img');
        img.src = item.image || '';
        img.alt = item.name;
        img.className = 'cart-item-image';
        img.loading = 'lazy';

        // Info section
        const info = document.createElement('div');
        info.className = 'cart-item-info';

        const title = document.createElement('h4');
        title.textContent = item.name;

        const price = document.createElement('p');
        price.className = 'cart-item-price';
        price.textContent = this._formatPrice(item.price);

        info.appendChild(title);
        info.appendChild(price);

        // Controls section
        const controls = document.createElement('div');
        controls.className = 'cart-item-controls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantity-btn minus';
        minusBtn.textContent = '−';
        minusBtn.type = 'button';
        minusBtn.setAttribute('aria-label', 'Diminuer la quantité');
        minusBtn.addEventListener('click', () => {
            this.updateQuantity(item.id, item.quantity - 1);
        });

        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'quantity';
        quantitySpan.textContent = String(item.quantity);
        quantitySpan.setAttribute('aria-label', `Quantité: ${item.quantity}`);

        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantity-btn plus';
        plusBtn.textContent = '+';
        plusBtn.type = 'button';
        plusBtn.setAttribute('aria-label', 'Augmenter la quantité');
        plusBtn.addEventListener('click', () => {
            this.updateQuantity(item.id, item.quantity + 1);
        });

        controls.appendChild(minusBtn);
        controls.appendChild(quantitySpan);
        controls.appendChild(plusBtn);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item';
        removeBtn.textContent = '×';
        removeBtn.type = 'button';
        removeBtn.setAttribute('aria-label', 'Supprimer ' + item.name);
        removeBtn.addEventListener('click', () => {
            this.removeItem(item.id);
        });

        // Assemble
        cartItem.appendChild(img);
        cartItem.appendChild(info);
        cartItem.appendChild(controls);
        cartItem.appendChild(removeBtn);

        return cartItem;
    }

    /**
     * Updates the cart modal content.
     * @private
     */
    _updateCartModal() {
        const cartItems = document.querySelector('.cart-items');
        const cartTotal = document.querySelector('.cart-total-amount');
        const emptyCart = document.querySelector('.empty-cart');
        const checkoutBtn = document.querySelector('.checkout-btn');

        if (!cartItems) return;

        // Clear existing items
        cartItems.textContent = '';

        if (this.isEmpty()) {
            if (emptyCart) emptyCart.style.display = 'block';
            if (checkoutBtn) checkoutBtn.disabled = true;
            if (cartTotal) cartTotal.textContent = this._formatPrice(0);
            return;
        }

        if (emptyCart) emptyCart.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = false;

        // Add items using safe DOM methods
        this.items.forEach(item => {
            const itemElement = this._createCartItemElement(item);
            cartItems.appendChild(itemElement);
        });

        if (cartTotal) {
            cartTotal.textContent = this._formatPrice(this.getTotal());
        }
    }

    /**
     * Shows a notification message to the user.
     * @private
     * @param {string} message - Message to display
     * @param {string} [type='success'] - Notification type ('success' or 'error')
     */
    _showNotification(message, type = 'success') {
        // Remove existing notification
        const existing = document.querySelector('.cart-notification');
        if (existing) existing.remove();

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, CART_CONFIG.NOTIFICATION_FADE_DELAY);
        }, CART_CONFIG.NOTIFICATION_DURATION);
    }

    // ========================================================================
    // MODAL METHODS
    // ========================================================================

    /**
     * Opens the cart modal.
     */
    openCart() {
        const modal = document.querySelector('.cart-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this._updateCartModal();

            // Focus management for accessibility
            const firstFocusable = modal.querySelector('button, [href], input');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    /**
     * Closes the cart modal.
     */
    closeCart() {
        const modal = document.querySelector('.cart-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ========================================================================
    // CHECKOUT METHODS
    // ========================================================================

    /**
     * Initiates the Stripe checkout process.
     * @returns {Promise<void>}
     */
    async checkout() {
        if (this.isEmpty()) {
            this._showNotification('Votre panier est vide', 'error');
            return;
        }

        const checkoutBtn = document.querySelector('.checkout-btn');
        const originalText = checkoutBtn?.textContent || 'Passer au paiement';

        try {
            // Show loading state
            this._setCheckoutLoading(true);

            // Get Stripe publishable key
            const configResponse = await fetch('/api/config');

            if (!configResponse.ok) {
                throw new Error('Impossible de charger la configuration de paiement');
            }

            const { publishableKey } = await configResponse.json();

            if (!publishableKey) {
                throw new Error('Configuration de paiement invalide');
            }

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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || 'Erreur lors de la création de la session'
                );
            }

            const { url } = await response.json();

            if (!url) {
                throw new Error('URL de paiement invalide');
            }

            // Redirect to Stripe Checkout
            window.location.href = url;

        } catch (error) {
            this._showNotification(
                error.message || 'Une erreur est survenue. Veuillez réessayer.',
                'error'
            );
            this._setCheckoutLoading(false, originalText);
        }
    }

    /**
     * Sets the checkout button loading state.
     * @private
     * @param {boolean} loading - Whether loading is in progress
     * @param {string} [text] - Button text to restore when not loading
     */
    _setCheckoutLoading(loading, text = 'Passer au paiement') {
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = loading;
            checkoutBtn.textContent = loading ? 'Chargement...' : text;
            checkoutBtn.setAttribute('aria-busy', String(loading));
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/** @type {ShoppingCart} Global cart instance */
const cart = new ShoppingCart();

// Export for module systems (if used)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShoppingCart, cart, CART_CONFIG };
}
