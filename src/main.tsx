import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
	<AuthProvider>
		<App />
	</AuthProvider>
);

// Register service worker for basic PWA support
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js')
			.then(() => { })
			.catch((err) => console.warn('Service worker registration failed:', err));
	});
}
