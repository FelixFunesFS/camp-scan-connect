import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure React is properly initialized
if (!React) {
  console.error('React not available');
}

createRoot(document.getElementById("root")!).render(<App />);
