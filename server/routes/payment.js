const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../db/supabase');
const { signToken } = require('../middleware/auth');

function getRazorpayInstance() {
  const key_id = (process.env.RAZORPAY_KEY_ID || '').trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!key_id || !key_secret) {
    throw new Error('Razorpay API keys missing in server environment variables (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
  }
  return { rzp: new Razorpay({ key_id, key_secret }), key_id };
}

// Pricing map (in paise)
const PLANS = {
  plus_monthly:  { amount: parseInt(process.env.PLUS_MONTHLY_PRICE)  || 7900,   plan: 'Plus', period: 'monthly' },
  plus_yearly:   { amount: parseInt(process.env.PLUS_YEARLY_PRICE)   || 69900,  plan: 'Plus', period: 'yearly'  },
  pro_monthly:   { amount: parseInt(process.env.PRO_MONTHLY_PRICE)   || 9900,   plan: 'Pro',  period: 'monthly' },
  pro_yearly:    { amount: parseInt(process.env.PRO_YEARLY_PRICE)    || 89900,  plan: 'Pro',  period: 'yearly'  }
};

// GET /payment/plans — return pricing
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id,
    plan: p.plan,
    period: p.period,
    amount: p.amount,
    amountInRupees: (p.amount / 100).toFixed(0)
  }));
  res.json({ plans });
});

// POST /payment/create-order
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    const planInfo = PLANS[planId];
    if (!planInfo) return res.status(400).json({ error: 'Invalid plan selected.' });

    const { rzp, key_id } = getRazorpayInstance();

    const order = await rzp.orders.create({
      amount: planInfo.amount,
      currency: 'INR',
      receipt: `rcpt_${String(req.user.id || 'usr').replace(/-/g, '').slice(0, 8)}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        email: req.user.email,
        plan: planInfo.plan,
        period: planInfo.period
      }
    });

    // Store pending subscription
    if (supabase) {
      const expiresAt = planInfo.period === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from('subscriptions').insert({
        user_id: req.user.id,
        plan: planInfo.plan,
        billing_period: planInfo.period,
        razorpay_order_id: order.id,
        status: 'pending',
        amount_paise: planInfo.amount,
        expires_at: expiresAt
      });
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: key_id,
      userEmail: req.user.email,
      userName: req.user.name
    });
  } catch (err) {
    console.error('[Razorpay] Create order error:', err);
    const msg = err?.error?.description || err?.description || err?.message || JSON.stringify(err);
    res.status(500).json({ error: 'Payment Error: ' + msg });
  }
});

// POST /payment/verify
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { orderId, paymentId, signature, planId } = req.body;
    const planInfo = PLANS[planId];
    if (!planInfo) return res.status(400).json({ error: 'Invalid plan.' });

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    const expiresAt = planInfo.period === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (supabase) {
      // Update subscription record
      await supabase.from('subscriptions')
        .update({
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          status: 'active',
          starts_at: new Date().toISOString(),
          expires_at: expiresAt
        })
        .eq('razorpay_order_id', orderId);

      // Update user plan
      await supabase.from('users').update({
        plan: planInfo.plan,
        trial_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }).eq('id', req.user.id);

      // Fetch updated user for new token
      const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single();
      const newToken = signToken(user || { ...req.user, plan: planInfo.plan });

      res.json({
        success: true,
        plan: planInfo.plan,
        expiresAt,
        token: newToken
      });
    } else {
      res.json({ success: true, plan: planInfo.plan, expiresAt });
    }
  } catch (err) {
    console.error('[Razorpay] Verify error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed.' });
  }
});

// GET /payment/status (current subscription status)
router.get('/status', requireAuth, async (req, res) => {
  try {
    if (!supabase) return res.json({ plan: req.user.plan });

    const { data: user } = await supabase
      .from('users')
      .select('plan, trial_used, trial_expires_at')
      .eq('id', req.user.id)
      .single();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      plan: user?.plan || 'Free',
      trialUsed: user?.trial_used || false,
      trialExpiresAt: user?.trial_expires_at,
      subscription: subscription || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
