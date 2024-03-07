import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ref, get } from "firebase/database";
import { auth, db } from "../db/firebase";

interface Plan {
  name: string;
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
  const [plan, setPlan] = useState<Plan>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) setLocation("/login");

      setUser(user);

      get(ref(db, `users/${user?.uid}`)).then((snapshot) => {
        const plan = snapshot.val().subscription || null;

        if (plan) setPlan(plan);
      });
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCheckout(planId: number) {
    fetch("http://localhost:3001/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planId, customerId: user?.uid }),
    })
      .then((res) => res.json())
      .then(({ session }) => (window.location = session.url))
      .catch(console.error);
  }

  return (
    <>
      {user && (
        <>
          <h1>Home</h1>
          <p>Logged in as {user.email}</p>
          {plan && (
            <div>
              <div>Plan: {plan.name}</div>
              <p>
                Your plan renews on{" "}
                {new Date(plan.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          )}
          <button onClick={() => auth.signOut()}>Logout</button>
          <div>
            {plans.map((plan) => (
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
