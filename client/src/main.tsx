import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Keep a single canonical host to avoid inconsistent URLs in sharing previews.
if (window.location.hostname === "armarinhospereira.com") {
	const targetUrl = `https://www.armarinhospereira.com${window.location.pathname}${window.location.search}${window.location.hash}`;
	window.location.replace(targetUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
