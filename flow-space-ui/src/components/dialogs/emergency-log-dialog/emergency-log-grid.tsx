import { DataGrid } from "devextreme-react";
import { useEmergencyLogDialog } from "./emergency-log-dialog-context";
import { Column, Grouping, SearchPanel } from "devextreme-react/data-grid";
import { useCallback } from "react";

export const EmergencyLogGrid = () => {
    const { emergencyStates, grouped, device } = useEmergencyLogDialog();

    const GroupRowContentByDate = useCallback(({ groupCell }: { groupCell: any }) => {
        const items = groupCell.data.items ?? groupCell.data.collapsedItems;
        const groupDataItem = items?.[0];

        if (!groupDataItem) {
            return null;
        }

        return (
            `${(groupDataItem.createdAt as Date).toLocaleString('ru-RU')}`
        );
    }, []);

    const GroupRowContentByDevice = useCallback(({ groupCell }: { groupCell: any }) => {
        const items = groupCell.data.items ?? groupCell.data.collapsedItems;
        const groupDataItem = items?.[0];

        if (!groupDataItem) {
            return null;
        }

        return (
            `${groupDataItem.deviceName} (${emergencyStates?.filter((x: any) => x.deviceId === groupDataItem.deviceId).length})`
        );
    }, [emergencyStates]);

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
                <SearchPanel visible={true} searchVisibleColumnsOnly={false} />
                <Grouping autoExpandAll={true} />

                <Column
                    dataField={'emergencyStateId'}
                    groupIndex={grouped && device ? 0 : undefined}
                    groupCellRender={(groupCell) => <GroupRowContentByDate groupCell={groupCell} />}
                    sortOrder={grouped ? 'desc' : undefined}
                    visible={false}
                />
                <Column
                    dataType='datetime'
                    dataField='createdAt'
                    width={150}
                    caption={'Время'}
                    allowSorting={true}
                    sortOrder='desc'
                    visible={!(grouped && device)}
                />
                <Column
                    dataType="number"
                    dataField="deviceId"
                    visible={false}
                    groupIndex={grouped && !device ? 0 : undefined}
                    groupCellRender={(groupCell) => <GroupRowContentByDevice groupCell={groupCell} />}
                />
                <Column
                    dataType='string'
                    dataField='deviceName'
                    caption={'Устройство'}
                    allowSorting={false}
                    width={200}
                />
                <Column
                    dataType='string'
                    dataField='description'
                    caption={'Описание НС'}
                    allowSorting={false}
                />
            </DataGrid>
            : null
    );
}