import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "../../features/shared/design-system.css";
import "../../features/teacher/styles.css";
import "../../features/teacher/practice/styles.css";
import "./styles.css";
import { App } from "./App";

document.body.className = "teacher-theme";

const root = document.getElementById("root");
if (!root) throw new Error("Teacher root not found");

createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
