import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import stripe from "stripe";

import serviceAccount from "./serviceAccountKey.json";
import { plans, type Plan } from "./plans";

import {
  PORT,
  CORS_ORIGIN,
  REDIRECT_URL,
  STRIPE_SECRET,
  STRIPE_ENDPOINT_SECRET,
} from "./config";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: "https://clever-fit-6084a-default-rtdb.firebaseio.com",
});

const stripeInstance = new stripe(STRIPE_SECRET, { typescript: true });

const app = express();

app.use(
  express.json({
    limit: "5mb",
    verify: (req, _, buf) => {
      // @ts-ignore
      req.rawBody = buf.toString();
    },
  }),
);

app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    optionsSuccessStatus: 200,
  }),
);

// Plan subscription checkout session endpoint. (Only for first time subscription)
app.get("/create-checkout-link", async (req, res) => {
  const { planId, customerId } = req.body;

  if (
    planId === undefined ||
    !customerId ||
    typeof planId !== "number" ||
    typeof customerId !== "string" ||
    customerId.length !== 28
  )
    return res.status(400).json({ message: "Bad request" });

  const plan = plans[planId];
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  const user = await admin.auth().getUser(customerId);
  if (!user) return res.status(404).json({ message: "User not found" });

  try {
    const session = await stripeInstance.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      customer_email: user.email,
      line_items: [
        {
          price: plan.price,
          quantity: 1,
        },
      ],
      metadata: {
        userId: customerId,
      },
      success_url: REDIRECT_URL,
      cancel_url: REDIRECT_URL,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/create-billing-portal-link", (req, res) => {});

// Stripe webhook endpoint
app.post("/webhooks/stripe", (req, res) => {
  const sig = req.headers["stripe-signature"]!;

  let event: stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      // @ts-ignore
      req.rawBody,
      sig,
      STRIPE_ENDPOINT_SECRET,
    );
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err}`);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as stripe.Checkout.Session;

      handleCheckoutComplete(session, session?.metadata?.userId as string);
      break;
    case "invoice.payment_succeeded":
      const invoice = event.data.object as stripe.Invoice;
      if (invoice.billing_reason === "subscription_create") return;

      handleInvoiceSucceeded(invoice);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});

// Handle checkout session completion and update the user subscription in the database. (Only for first time subscription)
async function handleCheckoutComplete(
  session: stripe.Checkout.Session,
  userId: string,
) {
  const subscriptionId = session.subscription as string;

  try {
    const subscription =
      await stripeInstance.subscriptions.retrieve(subscriptionId);

    const priceId = subscription.items.data[0].price.id;

    const plan: Plan = Object.values(plans).find(
      (p: Plan) => p.price === priceId,
    );

    await admin
      .database()
      .ref(`users/${userId}`)
      .update({
        subscription: {
          id: subscription.id,
          customerId: subscription.customer as string,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          plan: plan.name,
          priceId,
        },
      });
  } catch (error) {
    console.error(error);
  }
}

// Handle invoice payment succeeded event and update the user subscription in the database. (For recurring subscription)
async function handleInvoiceSucceeded(invoice: stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  try {
    const subscription =
      await stripeInstance.subscriptions.retrieve(subscriptionId);

    const priceId = subscription.items.data[0].price.id;

    const plan: Plan = Object.values(plans).find(
      (p: Plan) => p.price === priceId,
    );

    // Find the user with the matching subscription ID
    await admin
      .database()
      .ref("users")
      .orderByChild("subscription/id")
      .equalTo(subscriptionId)
      .once("value", (snapshot) => {
        const userId = Object.keys(snapshot.val())[0];
        const userRef = admin.database().ref(`users/${userId}`);

        userRef.update({
          subscription: {
            id: subscription.id,
            customerId: subscription.customer as string,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            plan: plan.name,
            priceId,
          },
        });
      });
  } catch (error) {
    console.error(error);
  }
}

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
