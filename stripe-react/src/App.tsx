import { Route } from "wouter";

import { Home, Login, Success } from "./routes";

export default function App() {
  return (
    <>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/success" component={Success} />
    </>
  );
}
