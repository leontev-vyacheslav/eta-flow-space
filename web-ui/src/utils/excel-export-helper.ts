import type { Cell } from 'exceljs';
import saveAs from 'file-saver';
import type { ExcelSaverModel } from './excel-saver-model';

const ExcelExportConstants = {
    colors: {
        excelGroupBackgroundColor: '#ff794e',
        excelGroupTextColor: '#e0e6eb',
        excelHeaderBackgroundColor: '#464646',
        excelHeaderTextColor: '#e0e6eb',
    }
};

const excelSaver = ({ workbook, workDate, title }: ExcelSaverModel) => {
    const formattedDate = new Date(workDate ?? new Date())
        .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const fileName = `${ title } (${ formattedDate }).xlsx`;

    workbook.xlsx.writeBuffer().then(buffer => saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName));
};

const excelCommonCellStyler = (excelCell: Cell) => {
    excelCell.font = { name: 'Tahoma', size: 12 };
    excelCell.alignment = { horizontal: 'left', vertical: 'middle' };
};

const excelHeaderCellStyler = (excelCell: Cell) => {
    excelCell.font = {
        name: 'Tahoma',
        size: 12,
        bold: true,
        color: { argb: ExcelExportConstants.colors.excelHeaderTextColor }
    };
    excelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
            argb: ExcelExportConstants.colors.excelHeaderBackgroundColor
        }
    };
};

const excelGroupCellStyler = (excelCell: Cell) => {

    excelCell.font = {
        name: 'Tahoma',
        size: 12,
        bold: true,
        color: { argb: ExcelExportConstants.colors.excelGroupTextColor }
    };
    excelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
            argb: ExcelExportConstants.colors.excelGroupBackgroundColor
        }
    };
}

export { excelSaver, excelCommonCellStyler, excelHeaderCellStyler, excelGroupCellStyler };
