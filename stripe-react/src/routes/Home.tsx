import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ref, get } from "firebase/database";
import { auth, db } from "../db/firebase";

interface Subscription {
  plan: string;
  currentPeriodEnd: number;
}

const plans = [
  {
    id: 0,
    name: "Basic plan",
    price: 299,
  },
  {
    id: 1,
    name: "Pro plan",
    price: 399,
  },
];

export default function Home() {
  const [user, setUser] = useState(auth.currentUser);
  const [subscription, setSubscription] = useState<Subscription>();
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) setLocation("/login");

      setUser(user);

      get(ref(db, `users/${user?.uid}`)).then((snapshot) => {
        const plan = snapshot.val().subscription || null;

        if (plan) setSubscription(plan);

        setLoading(false);
      });
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCheckout(planId: number) {
    fetch("http://localhost:3001/create-checkout-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planId, customerId: user?.uid }),
    })
      .then((res) => res.json())
      .then(({ url }) => (window.location = url))
      .catch(console.error);
  }

  function handleManageSubscription() {
    fetch("http://localhost:3001/create-billing-portal-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId: user?.uid }),
    })
      .then((res) => res.json())
      .then(({ url }) => (window.location = url))
      .catch(console.error);
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      {user && (
        <>
          <h1>Home</h1>
          <p>Logged in as {user.email}</p>
          {subscription && (
            <div>
              <div>Plan: {subscription.plan}</div>
              <p>
                Your plan renews on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              <button onClick={() => handleManageSubscription()}>
                Manage subscription
              </button>
            </div>
          )}
          <button onClick={() => auth.signOut()}>Logout</button>
          <div>
            {!subscription &&
              plans.map((plan) => (
                <div key={plan.id}>
                  <h2>{plan.name}</h2>
                  <p>${plan.price}</p>
                  <button onClick={() => handleCheckout(plan.id)}>
                    Checkout
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  );
}
