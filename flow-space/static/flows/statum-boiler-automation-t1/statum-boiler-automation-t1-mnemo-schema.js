export function create(config) {
    return {
        onBeforeMount(mnemoschemaElement) {
            console.log('onBeforeMount');
        },
        onAfterMount(mnemoschemaElement) {
            console.log('onAfterMount');
        },
    };
}