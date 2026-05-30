// api/checkout.js
// Vercel serverless function — creates a Stripe Checkout Session
// and returns the hosted payment-page URL.
//
// Your secret key is read from an environment variable (STRIPE_SECRET_KEY)
// that you set in the Vercel dashboard — it is NEVER in this code or on GitHub.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Prices live HERE on the server, so a buyer can't tamper with them.
// These match the PRODUCTS in index.html (priceCents). Keep them in sync.
const CATALOG = {
  'tee-noir':   { name: 'Noir Tee',      amount: 6800  },
  'hood-ash':   { name: 'Ash Hoodie',    amount: 14500 },
  'coat-rust':  { name: 'Rust Overcoat', amount: 32000 },
  'cap-gold':   { name: 'Gold Cap',      amount: 5400  },
  'pant-stone': { name: 'Stone Trouser', amount: 12800 },
  'tee-clay':   { name: 'Clay Tee',      amount: 7200  },
  'hood-ink':   { name: 'Ink Hoodie',    amount: 15200 },
  'cap-noir':   { name: 'Noir Cap',      amount: 4800  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items } = req.body; // [{ id, qty }, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const line_items = items
      .filter((it) => CATALOG[it.id] && it.qty > 0)
      .map((it) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: CATALOG[it.id].name },
          unit_amount: CATALOG[it.id].amount,
        },
        quantity: it.qty,
      }));

    if (line_items.length === 0) {
      return res.status(400).json({ error: 'No valid items' });
    }

    // Build the base URL from the incoming request (works on any Vercel domain)
    const origin =
      req.headers.origin ||
      `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/?paid=true`,
      cancel_url: `${origin}/?canceled=true`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
}
