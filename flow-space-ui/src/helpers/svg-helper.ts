export function setPathHeight(pathElement: SVGPathElement, newHeight: number) {
    const d = pathElement.getAttribute('d');
    if (!d) {
        return;
    }
    const updatedD = d.replace(/v-(\d+\.?\d*)/g, `v-${newHeight}`);
    pathElement.setAttribute('d', updatedD);
}