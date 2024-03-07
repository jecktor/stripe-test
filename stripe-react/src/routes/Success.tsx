import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ref, get } from "firebase/database";
import { auth, db } from "../db/firebase";

export default function Success() {
  const [user, setUser] = useState(auth.currentUser);
  const [sessionId, setSessionId] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) setLocation("/login");

      setUser(user);

      get(ref(db, `users/${user?.uid}`)).then((snapshot) => {
        const sessionId = snapshot.val().subscription.sessionId || "";

        if (!sessionId) setLocation("/");

        setSessionId(sessionId);
      });
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSuccess() {
    fetch("http://localhost:3001/payment-success", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, userId: user?.uid }),
    })
      .then((res) => res.json())
      .then(() => setLocation("/"))
      .catch(console.error);
  }

  return (
    <div>
      <p>Sucess</p>
      <button onClick={handleSuccess}>Start your plan</button>
    </div>
  );
}
