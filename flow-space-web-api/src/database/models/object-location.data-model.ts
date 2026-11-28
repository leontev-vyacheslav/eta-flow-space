import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'object_location',
    freezeTableName: true,
    timestamps: true,
})
export class ObjectLocationDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare address: string;

    @Column({
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare locality: string | null;

    // PostgreSQL restricts latitude to [-90, 90].
    @Column({
        type: DataType.DECIMAL(10, 8),
        allowNull: false,
    })
    declare latitude: number;

    // PostgreSQL restricts longitude to [-180, 180].
    @Column({
        type: DataType.DECIMAL(11, 8),
        allowNull: false,
    })
    declare longitude: number;

    @HasMany(() => DeviceDataModel, 'objectLocationId')
    declare devices?: DeviceDataModel[];
}
