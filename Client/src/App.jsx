import { useState } from "react";
import Layout from "./layout/Layout";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";

function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <LandingPage onEnter={() => setEntered(true)} />;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

export default App;