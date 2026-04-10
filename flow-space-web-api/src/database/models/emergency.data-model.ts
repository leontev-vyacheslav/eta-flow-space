import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'emergency',
    freezeTableName: true,
    timestamps: false,
})
export class EmergencyDataModel extends Model {
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
    declare reasons: Record<string, any>;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare updateStateInterval: number;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare lastStateUpdate: Date;
}
