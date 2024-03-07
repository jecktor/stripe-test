import { useState } from "react";
import { useLocation } from "wouter";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "../db/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  function handleSubmit() {
    if (!email || !password) return;

    signInWithEmailAndPassword(auth, email, password).then((credentials) => {
      get(ref(db, `users/${credentials.user.uid}`)).then((snapshot) => {
        const role = snapshot.val().role as string;

        if (role === "user") setLocation("/");
      });
    });
  }

  return (
    <div>
      <h1>Login</h1>
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button onClick={handleSubmit}>Login</button>
    </div>
  );
}
