import Stripe from 'stripe';
import { config } from './env.js';

let stripeInstance;

export const initializeStripe = () => {
  if (!stripeInstance && config.stripe.secretKey) {
    stripeInstance = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    });
    console.log('Stripe initialized successfully');
  }
  return stripeInstance;
};

export const stripe = initializeStripe();

export default stripe;
