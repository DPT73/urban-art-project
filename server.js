/**
 * @fileoverview Express server for Urban Art e-commerce platform with Stripe integration.
 * Handles checkout sessions, webhooks, and serves static content.
 * @author Urban Art Team
 * @version 2.0.0
 */

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

/** @type {Object} Server configuration constants */
const CONFIG = Object.freeze({
    PORT: process.env.PORT || 3000,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    ALLOWED_COUNTRIES: ['FR', 'BE', 'CH', 'DE', 'IT', 'ES', 'NL', 'LU'],
    CURRENCY: 'eur',
    RATE_LIMIT: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 100
    }
});

// ============================================================================
// LOGGER UTILITY
// ============================================================================

/**
 * Logging levels for consistent output formatting.
 * @readonly
 * @enum {string}
 */
const LogLevel = Object.freeze({
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
});

/**
 * Logger utility for consistent, structured logging.
 * In production, this could be replaced with a proper logging library.
 */
const logger = {
    /**
     * Formats a log message with timestamp and level.
     * @param {string} level - The log level
     * @param {string} message - The message to log
     * @param {Object} [data] - Optional data to include
     * @returns {string} Formatted log string
     */
    format(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level}] ${message}${dataStr}`;
    },

    /**
     * Logs an info message.
     * @param {string} message - The message to log
     * @param {Object} [data] - Optional data to include
     */
    info(message, data) {
        console.log(this.format(LogLevel.INFO, message, data));
    },

    /**
     * Logs a warning message.
     * @param {string} message - The message to log
     * @param {Object} [data] - Optional data to include
     */
    warn(message, data) {
        console.warn(this.format(LogLevel.WARN, message, data));
    },

    /**
     * Logs an error message.
     * @param {string} message - The message to log
     * @param {Error|Object} [error] - Optional error object
     */
    error(message, error) {
        const errorData = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error;
        console.error(this.format(LogLevel.ERROR, message, errorData));
    }
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates cart items structure and data.
 * @param {Array} items - Cart items to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateCartItems(items) {
    if (!items || !Array.isArray(items)) {
        return { valid: false, error: 'Items must be an array' };
    }

    if (items.length === 0) {
        return { valid: false, error: 'Cart cannot be empty' };
    }

    if (items.length > 100) {
        return { valid: false, error: 'Too many items in cart (max 100)' };
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item || typeof item !== 'object') {
            return { valid: false, error: `Invalid item at index ${i}` };
        }

        if (!item.name || typeof item.name !== 'string' || item.name.length > 200) {
            return { valid: false, error: `Invalid item name at index ${i}` };
        }

        if (typeof item.price !== 'number' || item.price <= 0 || item.price > 1000000) {
            return { valid: false, error: `Invalid price at index ${i}` };
        }

        if (item.quantity !== undefined) {
            if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
                return { valid: false, error: `Invalid quantity at index ${i}` };
            }
        }

        if (item.description && typeof item.description !== 'string') {
            return { valid: false, error: `Invalid description at index ${i}` };
        }
    }

    return { valid: true };
}

/**
 * Sanitizes a string for safe use in API responses and Stripe.
 * @param {string} str - String to sanitize
 * @param {number} [maxLength=500] - Maximum length
 * @returns {string} Sanitized string
 */
function sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Simple in-memory rate limiter.
 * In production, use Redis or a dedicated rate limiting service.
 */
const rateLimiter = {
    /** @type {Map<string, {count: number, resetTime: number}>} */
    requests: new Map(),

    /**
     * Checks if a request should be rate limited.
     * @param {string} ip - Client IP address
     * @returns {boolean} True if request should be blocked
     */
    isRateLimited(ip) {
        const now = Date.now();
        const record = this.requests.get(ip);

        if (!record || now > record.resetTime) {
            this.requests.set(ip, {
                count: 1,
                resetTime: now + CONFIG.RATE_LIMIT.WINDOW_MS
            });
            return false;
        }

        record.count++;
        return record.count > CONFIG.RATE_LIMIT.MAX_REQUESTS;
    },

    /**
     * Cleanup old entries periodically.
     */
    cleanup() {
        const now = Date.now();
        for (const [ip, record] of this.requests.entries()) {
            if (now > record.resetTime) {
                this.requests.delete(ip);
            }
        }
    }
};

// Cleanup rate limiter every minute
setInterval(() => rateLimiter.cleanup(), 60000);

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// CORS configuration
app.use(cors({
    origin: CONFIG.FRONTEND_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Static file serving with caching
app.use(express.static('.', {
    maxAge: '1h',
    etag: true
}));

// JSON body parser (except for webhooks)
app.use(bodyParser.json());

// Rate limiting middleware for API routes
app.use('/api/', (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    if (rateLimiter.isRateLimited(clientIp)) {
        logger.warn('Rate limit exceeded', { ip: clientIp });
        return res.status(429).json({
            error: 'Too many requests. Please try again later.'
        });
    }
    next();
});

// ============================================================================
// WEBHOOK ENDPOINT
// ============================================================================

/**
 * Stripe webhook handler for processing payment events.
 * Must be before bodyParser to receive raw body.
 * @route POST /webhook
 */
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        logger.warn('Webhook received without signature');
        return res.status(400).json({ error: 'Missing signature' });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        logger.error('Webhook signature verification failed', err);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutComplete(event.data.object);
                break;

            case 'payment_intent.succeeded':
                logger.info('Payment succeeded', {
                    paymentIntentId: event.data.object.id
                });
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            default:
                logger.info('Unhandled webhook event', { type: event.type });
        }
    } catch (err) {
        logger.error('Error processing webhook event', err);
        // Return 200 to prevent Stripe from retrying
        // The error is logged and can be handled asynchronously
    }

    res.json({ received: true });
});

/**
 * Handles successful checkout completion.
 * @param {Object} session - Stripe checkout session object
 */
async function handleCheckoutComplete(session) {
    logger.info('Checkout completed', {
        sessionId: session.id,
        customerEmail: session.customer_details?.email,
        amount: session.amount_total
    });

    // In production, implement:
    // 1. Save order to database
    // 2. Send confirmation email
    // 3. Update inventory
    // 4. Trigger fulfillment process
}

/**
 * Handles failed payment attempts.
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentFailed(paymentIntent) {
    const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error';

    logger.warn('Payment failed', {
        paymentIntentId: paymentIntent.id,
        error: errorMessage
    });

    // In production, implement:
    // 1. Notify customer
    // 2. Log for analytics
    // 3. Trigger recovery flow
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Returns Stripe publishable key for client-side initialization.
 * @route GET /api/config
 */
app.get('/api/config', (req, res) => {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
        logger.error('Stripe publishable key not configured');
        return res.status(500).json({ error: 'Payment configuration error' });
    }

    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

/**
 * Creates a Stripe checkout session for cart items.
 * @route POST /api/create-checkout-session
 * @param {Object} req.body - Request body
 * @param {Array} req.body.items - Cart items array
 */
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { items } = req.body;

        // Validate cart items
        const validation = validateCartItems(items);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Convert items to Stripe line items with sanitization
        const lineItems = items.map(item => ({
            price_data: {
                currency: CONFIG.CURRENCY,
                product_data: {
                    name: sanitizeString(item.name, 200),
                    description: sanitizeString(item.description || '', 500),
                    images: item.image ? [item.image] : [],
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity || 1,
        }));

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${CONFIG.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${CONFIG.FRONTEND_URL}/cancel.html`,
            shipping_address_collection: {
                allowed_countries: CONFIG.ALLOWED_COUNTRIES,
            },
            metadata: {
                itemCount: items.length,
                items: JSON.stringify(items.map(i => ({
                    name: sanitizeString(i.name, 100),
                    quantity: i.quantity || 1
                }))),
            },
        });

        logger.info('Checkout session created', {
            sessionId: session.id,
            itemCount: items.length
        });

        res.json({ sessionId: session.id, url: session.url });

    } catch (error) {
        logger.error('Error creating checkout session', error);

        // Don't expose internal error details to client
        res.status(500).json({
            error: 'Unable to create checkout session. Please try again.'
        });
    }
});

/**
 * Retrieves a checkout session by ID.
 * @route GET /api/checkout-session/:sessionId
 * @param {string} req.params.sessionId - Stripe session ID
 */
app.get('/api/checkout-session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Validate session ID format (Stripe session IDs start with 'cs_')
        if (!sessionId || !sessionId.startsWith('cs_')) {
            return res.status(400).json({ error: 'Invalid session ID format' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Return only necessary fields for security
        res.json({
            id: session.id,
            status: session.status,
            payment_status: session.payment_status,
            customer_email: session.customer_details?.email,
            amount_total: session.amount_total
        });

    } catch (error) {
        logger.error('Error retrieving checkout session', error);

        if (error.code === 'resource_missing') {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.status(500).json({ error: 'Unable to retrieve session' });
    }
});

// ============================================================================
// STATIC FILE SERVING
// ============================================================================

/**
 * Serves the main index.html file.
 * @route GET /
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 handler for undefined routes.
 */
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

/**
 * Global error handler.
 */
app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Validates required environment variables before starting.
 * @returns {boolean} True if all required vars are present
 */
function validateEnvironment() {
    const required = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        logger.error('Missing required environment variables', { missing });
        return false;
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        logger.warn('STRIPE_WEBHOOK_SECRET not set - webhooks will not be verified');
    }

    return true;
}

// Start server
if (validateEnvironment()) {
    app.listen(CONFIG.PORT, () => {
        logger.info('Server started', {
            port: CONFIG.PORT,
            env: process.env.NODE_ENV || 'development',
            stripeConfigured: true
        });
    });
} else {
    logger.error('Server startup aborted due to configuration errors');
    process.exit(1);
}

module.exports = { app, validateCartItems, sanitizeString };
