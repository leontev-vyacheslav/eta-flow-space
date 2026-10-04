import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app.tsx'

// After a deployment an open tab still asks for the old lazy chunks, which are gone:
// reload once to get the new index.html; if it fails again right after the reload, let the error through
const preloadErrorReloadAtKey = 'preload-error-reload-at';

window.addEventListener('vite:preloadError', (event) => {
    try {
        const reloadedAt = Number(sessionStorage.getItem(preloadErrorReloadAtKey) ?? 0);
        if (Date.now() - reloadedAt < 10_000) {
            return;
        }
        sessionStorage.setItem(preloadErrorReloadAtKey, String(Date.now()));
    } catch {
        return;
    }
    event.preventDefault();
    window.location.reload();
});

createRoot(document.getElementById('root')!).render(
    <App />
)
