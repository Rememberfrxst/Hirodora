import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if (
  import.meta.env.PROD &&
  !import.meta.env.STANDALONE &&
  /^https?:$/.test(location.protocol) &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("./sw.js")
      .catch((error) =>
        console.warn("Offline installation unavailable:", error),
      );
  });
}
