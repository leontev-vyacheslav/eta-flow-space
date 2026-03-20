export function isSuppressedForLongPress(target: HTMLElement | null): boolean {
    while (target) {
        if (
            target.classList.contains('leaflet-popup') ||
            target.classList.contains('leaflet-popup-content') ||
            target.classList.contains('leaflet-popup-content-wrapper') ||
            // add any other selectors you want to exclude:
            target.closest?.('[data-no-long-press]') !== null
        ) {
            return true;
        }
        target = target.parentElement;
    }
    return false;
}