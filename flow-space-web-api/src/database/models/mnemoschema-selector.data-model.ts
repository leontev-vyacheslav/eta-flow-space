import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'mnemoschema_selector',
    freezeTableName: true,
    timestamps: true,
})
export class MnemoschemaSelectorDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => DeviceDataModel)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        unique: true,
    })
    declare deviceId: number;

    @BelongsTo(() => DeviceDataModel, 'deviceId')
    declare device: DeviceDataModel;

    @ForeignKey(() => DeviceDataModel)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare sourceDeviceId: number;

    @BelongsTo(() => DeviceDataModel, 'sourceDeviceId')
    declare sourceDevice: DeviceDataModel;
}
