import { StrictMode } from "react"; // dev-mode extra checks wrapper
import { createRoot } from "react-dom/client"; // react 18 root api
import App from "./app/App.jsx"; // root app component
import "./index.css"; // global styles

// app entry point
createRoot(document.getElementById("root")).render( // mount to #root div
  <StrictMode>
    <App />
  </StrictMode>
);
