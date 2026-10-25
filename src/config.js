// Defaults to the same host the page was loaded from (works whether you open
// the app as localhost or from another device via the server's LAN IP),
// so nothing needs to be reconfigured per device. Override with
// VITE_API_BASE_URL in .env only if the backend runs on a different host.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;
