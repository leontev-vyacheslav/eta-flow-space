import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'flow',
    freezeTableName: true,
    timestamps: false,
})
export class FlowDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING(32),
        allowNull: true,
    })
    declare code: string;

    @Column({
        type: DataType.STRING(32),
        allowNull: true,
    })
    declare name: string;

    @Column({
        type: DataType.STRING(32),
        allowNull: true,
    })
    declare description: string;

    @Column({
        type: DataType.STRING(16),
        allowNull: true,
    })
    declare uid: string;

    @HasMany(() => DeviceDataModel, 'flowId')
    declare devices?: DeviceDataModel[];
}
