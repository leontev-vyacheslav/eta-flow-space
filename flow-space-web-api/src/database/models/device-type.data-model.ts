import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'device_type',
    freezeTableName: true,
    timestamps: true,
})
export class DeviceTypeDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING(32),
        allowNull: false,
        unique: true,
    })
    declare code: string;

    @Column({
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.STRING(64),
        allowNull: true,
    })
    declare description: string;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    declare settings: Record<string, any>;

    @HasMany(() => DeviceDataModel, 'deviceTypeId')
    declare devices?: DeviceDataModel[];
}
