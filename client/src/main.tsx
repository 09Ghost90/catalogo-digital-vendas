import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function applyBootstrapRouteFromQuery() {
	const url = new URL(window.location.href);
	const route = url.searchParams.get("__route")?.trim();
	if (!route || !route.startsWith("/")) return;

	url.searchParams.delete("__route");
	const remaining = url.searchParams.toString();
	const nextUrl = `${route}${remaining ? `?${remaining}` : ""}${url.hash}`;
	window.history.replaceState({}, "", nextUrl);
}

function setupAnalytics() {
	const endpointRaw = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
	const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined;

	const endpoint = endpointRaw?.trim();
	if (!endpoint || !websiteId) return;
	if (endpoint.includes("%VITE_")) return;

	const base = endpoint.replace(/\/$/, "");
	const script = document.createElement("script");
	script.defer = true;
	script.src = `${base}/umami`;
	script.setAttribute("data-website-id", websiteId);
	document.body.appendChild(script);
}

// Keep a single canonical host to avoid inconsistent URLs in sharing previews.
if (window.location.hostname === "armarinhospereira.com") {
	const targetUrl = `https://www.armarinhospereira.com${window.location.pathname}${window.location.search}${window.location.hash}`;
	window.location.replace(targetUrl);
}

applyBootstrapRouteFromQuery();

setupAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
