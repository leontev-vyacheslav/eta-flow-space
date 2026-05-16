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

    return {
        onBeforeMount(mnemoschemaElement, deviceState) {
            applyMnemoschemaSize(mnemoschemaElement);
        },

        onAfterMount(mnemoschemaElement, deviceState) {
            const resizeHandler = () => applyMnemoschemaSize(mnemoschemaElement);
            xSmallMedia.addEventListener('change', resizeHandler, { signal });
            smallMedia.addEventListener('change', resizeHandler, { signal });
            mediumMedia.addEventListener('change', resizeHandler, { signal });
            largeMedia.addEventListener('change', resizeHandler, { signal });
        },
    };
}