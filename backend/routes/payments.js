const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}
// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { plan, priceId } = req.body;

        // We'll create a generic Stripe Checkout session here
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `CloudFusion ${plan} Storage Plan`,
                            description: 'Upgrade your multi-cloud storage tier.',
                        },
                        unit_amount: plan === 'Pro' ? 29900 : 99900, // Amount in Paise (x100 for Rupees)
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `http://localhost:5500/frontend/index.html?payment=success&plan=${plan}`,
            cancel_url: `http://localhost:5500/frontend/index.html?payment=cancel`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe error:', error.message);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// POST /api/payments/create-razorpay-order
router.post('/create-razorpay-order', async (req, res) => {
    try {
        if (!razorpayInstance) {
            return res.status(500).json({ error: 'Razorpay keys not configured on server' });
        }

        const { plan } = req.body;
        const amount = plan === 'Pro' ? 29900 : 99900; // Amount in Paise (x100 for Rupees)

        const options = {
            amount: amount,
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`
        };

        const order = await razorpayInstance.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            keyId: process.env.RAZORPAY_KEY_ID // Frontend needs this to initialize checkout
        });
    } catch (error) {
        console.error('Razorpay error:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

module.exports = router;
