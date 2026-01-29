import { useCallback, useRef } from "react";
import { useDashboardPage } from "../../dashboard-page-context"
import dxPopover from "devextreme/ui/popover";

export const useMnemoschemaPopover = () => {
    const { schemaTypeInfoPropertiesChain, dataschema } = useDashboardPage();
    const popoverInstance = useRef<dxPopover<any>>(null);

    return useCallback((event: MouseEvent) => {
        const target = (event.target as Element)?.closest?.("[data-state]");
        if (!target) {
            return;
        }

        const dataStateAttr = target.getAttribute("data-state");

        if (!dataStateAttr) {
            return;
        }

        if (popoverInstance.current) {
            popoverInstance.current.dispose();
        }

        const propertyInfo = schemaTypeInfoPropertiesChain?.find(({ propertiesChainValuePair }) => (propertiesChainValuePair.propertiesChain === dataStateAttr));

        if (!propertyInfo) {
            return;
        }

        document.querySelectorAll("[data-app-popover]").forEach(element => {
            try {
                element.remove();
            } catch (error) {
                console.error(error);
            }
        });

        const root = document.createElement("div");
        root.setAttribute("data-app-popover", "");
        document.body.appendChild(root);

        let value = propertyInfo.propertiesChainValuePair.value;
        if (propertyInfo.typeInfo?.ui.editor.editorOptions.type === 'datetime') {
            const date = new Date(value);
            const formatAttr = target.getAttribute('data-state-format');
            if (formatAttr === 'date') {
                value = date.toLocaleDateString('ru-RU');
            } else if (formatAttr === 'time') {
                value = date.toLocaleTimeString('ru-RU');
            } else {
                value = date.toLocaleString('ru-RU');
            }
        } else if (propertyInfo.typeInfo?.isEnum) {
            const enumDescription = dataschema.$defs[propertyInfo.typeInfo?.typeName].enumDescriptions[value]?.split(' - ').pop();
            value = enumDescription ? enumDescription + ' (' + value + ')' : `<span style='color: red'>Ошибка (${value})</span>`
        } else {
            const unit = propertyInfo.typeInfo?.unit;
            value = `${value}${unit ? ' ' + unit : ''}`;
        }

        const html = `<table class='simple-grid'>
                            <thead>
                                <tr><th colspan='2'>${propertyInfo.typeInfo?.ui.editor.label.text ?? ''}</th></tr>
                            </thead>
                           <tbody>
                                <tr><td>Свойство:</td><td>${propertyInfo.propertiesChainValuePair.propertiesChain}</td></tr>
                                <tr><td>Тип:</td><td>${propertyInfo.typeInfo?.typeName}</td></tr>
                                <tr><td>Значение:</td><td>${value}</td></tr>
                           </tbody>
                       </table>
                    `;
        popoverInstance.current = new dxPopover(root, {
            minWidth: 200,
            shading: false,
            hideOnOutsideClick: true,
            contentTemplate: () => {
                const div = document.createElement("div");
                div.innerHTML = html;
                return div;
            },
            position: {
                at: "top left",
                my: "top left",
                of: window,
                offset: {
                    x: event.clientX,
                    y: event.clientY
                },
            }
        });

        popoverInstance.current.show();
    }, [dataschema, schemaTypeInfoPropertiesChain]);
}