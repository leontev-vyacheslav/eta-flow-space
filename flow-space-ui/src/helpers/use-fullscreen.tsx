import { useState, useEffect, useCallback } from "react";

export function useFullScreen() {
    const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);

    useEffect(() => {
        const handler = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullScreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }, []);

    return { isFullScreen, toggleFullScreen };
}