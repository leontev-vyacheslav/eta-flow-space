export function create({ signal } = {}) {
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
    };
}