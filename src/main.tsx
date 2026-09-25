import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@/styles/globals.css";
import "@/i18n"; // initialise i18next before any component renders
import { router } from "@/spa/router";

// Static demo build: answer the API from memory before anything fetches.
if (import.meta.env.VITE_DEMO === "true") (await import("@/demo/api")).installDemoApi();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
