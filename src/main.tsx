
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerServiceWorker } from "./app/lib/pwa-utils";

  createRoot(document.getElementById("root")!).render(<App />);

  // Register SW after render so it doesn't block initial paint
  registerServiceWorker();
