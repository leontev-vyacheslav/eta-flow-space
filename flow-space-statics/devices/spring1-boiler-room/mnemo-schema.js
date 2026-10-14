export function create({ signal } = {}) {
    const xSmallMedia = window.matchMedia('(max-width: 599.99px)');
    const smallMedia = window.matchMedia('(min-width: 600px) and (max-width: 959.99px)');
    const mediumMedia = window.matchMedia('(min-width: 960px) and (max-width: 1279.99px)');
    const largeMedia = window.matchMedia('(min-width: 1280px)');

    function applyMnemoschemaSize(mnemoschemaElement) {
        const isXSmall = xSmallMedia.matches;
        const isSmall = smallMedia.matches;
        const isLarge = largeMedia.matches;

        const height = (isSmall || isXSmall) ? '450px'
            : isLarge ? '540px'
                : '640px';

        mnemoschemaElement.setAttribute('height', height);
        mnemoschemaElement.setAttribute('width', '100%');
        mnemoschemaElement.style.flex = (isSmall || isXSmall) ? '1' : '';
    }

    const highlightColor = '#FF9800';
    const highlightTiming = { duration: 1300, iterations: 3, easing: 'ease-in-out' };

    // pulses the elements whose data-device (codes separated by ';') lists the device
    function highlightDevice(mnemoschemaElement, deviceCode) {
        const shapeTags = ['rect', 'path', 'line', 'polyline', 'polygon', 'circle', 'ellipse'];

        mnemoschemaElement.querySelectorAll('[data-device]')
            .forEach(element => {
                if (!element.dataset.device.split(';').map(c => c.trim()).includes(deviceCode)) {
                    return;
                }

                // only the middle keyframe is given: the animation starts and ends at the element's own colours
                const keyframe = shapeTags.includes(element.tagName.toLowerCase())
                    ? { offset: 0.5, stroke: highlightColor, strokeWidth: '2.5' }
                    : { offset: 0.5, fill: highlightColor };

                const animation = element.animate([keyframe], highlightTiming);
                signal?.addEventListener('abort', () => animation.cancel(), { once: true });
            });
    }

    return {
        onDeviceSelected(mnemoschemaElement, deviceCode) {
            highlightDevice(mnemoschemaElement, deviceCode);
        },

        onBeforeMount(mnemoschemaElement, deviceStates) {
            applyMnemoschemaSize(mnemoschemaElement);
        },

        onAfterMount(mnemoschemaElement, deviceStates) {
            const resizeHandler = () => applyMnemoschemaSize(mnemoschemaElement);
            xSmallMedia.addEventListener('change', resizeHandler, { signal });
            smallMedia.addEventListener('change', resizeHandler, { signal });
            mediumMedia.addEventListener('change', resizeHandler, { signal });
            largeMedia.addEventListener('change', resizeHandler, { signal });
        },
    };
}