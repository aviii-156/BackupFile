import { stripe } from '../config/stripe.js';
import { config } from '../config/env.js';

/**
 * Payment Service - Stripe integration
 */

/**
 * Create a payment intent for order
 */
export const createPaymentIntent = async (amount, currency = 'inr', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return paymentIntent;
  } catch (error) {
    console.error('Create payment intent error:', error);
    throw new Error('Failed to create payment intent');
  }
};

/**
 * Confirm a payment intent
 */
export const confirmPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Confirm payment intent error:', error);
    throw new Error('Failed to confirm payment');
  }
};

/**
 * Create or retrieve Stripe customer
 */
export const createOrGetCustomer = async (email, name, phone, metadata = {}) => {
  try {
    // Search for existing customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error('Create customer error:', error);
    throw new Error('Failed to create customer');
  }
};

/**
 * Create subscription
 */
export const createSubscription = async (customerId, priceId) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    console.error('Create subscription error:', error);
    throw new Error('Failed to create subscription');
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw new Error('Failed to cancel subscription');
  }
};

/**
 * Retrieve subscription
 */
export const retrieveSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Retrieve subscription error:', error);
    throw new Error('Failed to retrieve subscription');
  }
};

/**
 * Create refund
 */
export const createRefund = async (chargeId, amount = null) => {
  try {
    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amount && { amount: Math.round(amount * 100) }),
    });

    return refund;
  } catch (error) {
    console.error('Create refund error:', error);
    throw new Error('Failed to create refund');
  }
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    console.error('Webhook verification error:', error);
    throw new Error('Invalid webhook signature');
  }
};

/**
 * Create connected account for vendor (for marketplace)
 */
export const createConnectedAccount = async (email, country = 'IN') => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return account;
  } catch (error) {
    console.error('Create connected account error:', error);
    throw new Error('Failed to create connected account');
  }
};

/**
 * Create account link for vendor onboarding
 */
export const createAccountLink = async (accountId, refreshUrl, returnUrl) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink;
  } catch (error) {
    console.error('Create account link error:', error);
    throw new Error('Failed to create account link');
  }
};

export default {
  createPaymentIntent,
  confirmPaymentIntent,
  createOrGetCustomer,
  createSubscription,
  cancelSubscription,
  retrieveSubscription,
  createRefund,
  verifyWebhookSignature,
  createConnectedAccount,
  createAccountLink,
};
