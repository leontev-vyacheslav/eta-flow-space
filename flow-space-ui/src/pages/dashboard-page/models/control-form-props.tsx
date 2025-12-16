import type { FieldDataChangedEvent } from "devextreme/ui/form";

export type ControlFormProps = {
    onFieldDataChanged?: ((e: FieldDataChangedEvent) => void) | undefined
};