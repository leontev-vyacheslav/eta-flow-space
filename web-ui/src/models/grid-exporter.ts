import dxDataGrid from 'devextreme/ui/data_grid';

export type GridExporterModel = {
  dataGrid: dxDataGrid<any, number>;

  title: string;
}

export type GridExporterExtendedModel = GridExporterModel;
