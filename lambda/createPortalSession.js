const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://devopsia.co',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const authHeader = event.headers && event.headers.Authorization || event.headers && event.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }), headers };
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const db = admin.firestore();
    const doc = await db.collection('users').doc(uid).get();
    const data = doc.exists ? doc.data() : {};
    const customerId = data.stripeCustomerId;
    if (!customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Stripe customer not found' }), headers };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://devopsia.co/profile/'
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }), headers };
  } catch (error) {
    console.error('Stripe portal error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Portal session creation failed' }), headers };
  }
};
