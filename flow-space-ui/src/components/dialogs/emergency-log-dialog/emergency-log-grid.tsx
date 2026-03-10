import { DataGrid } from "devextreme-react";
import { useEmergencyLogDialog } from "./emergency-log-dialog-context";
import { Column, Grouping, SearchPanel } from "devextreme-react/data-grid";
import { useCallback } from "react";

export const EmergencyLogGrid = () => {
    const { emergencyStates, grouped } = useEmergencyLogDialog();

    const GroupRowContent = useCallback(({ groupCell }: { groupCell: any }) => {
        const items = groupCell.data.items ?? groupCell.data.collapsedItems;
        const groupDataItem = items?.[0];

        if (!groupDataItem) {
            return null;
        }

        return (
            (groupDataItem.createdAt as Date).toLocaleString('ru-RU')
        );
    }, []);

    return (
        emergencyStates ?
            <DataGrid className='app-grid'
                keyExpr={'id'}
                showColumnLines
                columnAutoWidth={true}
                dataSource={emergencyStates}
                height={'100%'}
                focusedRowEnabled
            >
                <SearchPanel visible={true} searchVisibleColumnsOnly={false}  />
                <Grouping autoExpandAll={true} key={'id'} />

                <Column
                    dataField={'emergencyStateId'}
                    groupIndex={grouped ? 0 : undefined}
                    groupCellRender={(groupCell) => <GroupRowContent groupCell={groupCell} />}
                    visible={false}
                />
                 <Column
                    dataType='string'
                    dataField='deviceName'
                    caption={'Устройство'}
                    allowSorting={false}
                ></Column>

                <Column
                    dataType='datetime'
                    dataField='createdAt'
                    width={150}
                    caption={'Время'}
                    allowSorting={true}
                    sortOrder='desc'
                    visible={!grouped}
                >
                </Column>
                <Column
                    dataType='string'
                    dataField='description'
                    caption={'Описание НС'}
                    allowSorting={false}
                >
                </Column>

            </DataGrid>
            : null
    );
}