import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/open-sauce-one/600.css";
import "@fontsource/open-sauce-one/700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
