import { Workbook } from 'exceljs';

export type ExcelSaverModel = {
  workbook: Workbook,
  workDate?: Date,
  title: string
}
