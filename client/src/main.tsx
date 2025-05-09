import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker as registerPWAServiceWorker } from "./lib/service-worker";
import { registerServiceWorker as registerNotificationServiceWorker } from "./lib/notifications";

// Register service worker cho PWA và background mining
registerPWAServiceWorker()
  .then(() => {
    console.log('PWA service worker registered successfully');
    
    // Sau đó đăng ký service worker cho notifications
    return registerNotificationServiceWorker();
  })
  .catch(error => {
    console.error('Failed to register PWA service worker:', error);
    
    // Nếu không đăng ký được PWA service worker, vẫn thử đăng ký notifications
    registerNotificationServiceWorker();
  });

createRoot(document.getElementById("root")!).render(<App />);
