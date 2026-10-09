import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "../../features/shared/design-system.css";
import "../../features/teacher/styles.css";
import "../../features/teacher/practice/styles.css";
import "../../features/teacher/textbook/styles.css";
import "../../features/story/styles.css";
import "../../features/fortune/styles.css";
import "./styles.css";
import "./motion.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Crew root not found");

createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
