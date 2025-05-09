import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/notifications";

// Register service worker for push notifications and PWA capabilities
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
