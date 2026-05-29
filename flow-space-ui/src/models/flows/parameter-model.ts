export interface ParameterModel {
  dataField: string;
  editorType:
    | "dxSelectBox"
    | "dxTextBox"
    | "dxNumberBox"
    | "dxDateBox"
    | "dxCheckBox";
  description: string;
  type: string;
  dataSource?: any;
  ui: any;
}
