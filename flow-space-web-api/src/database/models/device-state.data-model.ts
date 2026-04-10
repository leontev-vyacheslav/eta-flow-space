import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'device_state',
    freezeTableName: true,
    timestamps: false,
})
export class DeviceStateDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => DeviceDataModel)
    @Column(DataType.INTEGER)
    declare deviceId: number;

    @BelongsTo(() => DeviceDataModel, 'deviceId')
    declare device?: DeviceDataModel;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    declare state: Record<string, any>;
}
