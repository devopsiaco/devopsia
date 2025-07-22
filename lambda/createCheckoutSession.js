const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_LOOKUP = {
  pro: 'price_123_pro',
  team: 'price_456_team',
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://devopsia.co',
  };

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
        headers,
      };
    }
    const { plan } = JSON.parse(event.body);
    const priceId = PRICE_LOOKUP[plan];

    if (!priceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid plan selected' }),
        headers,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'https://devopsia.co/thanks?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://devopsia.co/cancelled',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl: session.url }),
      headers,
    };
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Checkout session creation failed.' }),
      headers,
    };
  }
};
