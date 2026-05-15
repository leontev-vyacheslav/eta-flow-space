import Form, { Item, Label } from "devextreme-react/form";
import type { ParameterModel } from "../../../models/flows/parameter-model";

export const ReportParametric = ({ parameters, parameterValues, onParameterValuesChange }: { parameters: ParameterModel[]; parameterValues: any; onParameterValuesChange: (values: any) => void }) => {
    return (
        <Form
            formData={parameterValues}
            onFieldDataChanged={(e) => {
                const formData = { ...parameterValues, [e.dataField as keyof any]: e.value };
                const params = { ...formData };

                onParameterValuesChange(params);

                return formData;
            }}

        >   {
                parameters.map(p => (
                    <Item
                        key={p.dataField}
                        dataField={p.dataField}
                        editorType={p.editorType}
                        editorOptions={p.ui.editorOptions}>
                        <Label {...p.ui.label} />
                    </Item>
                ))
            }
        </Form>
    );
}