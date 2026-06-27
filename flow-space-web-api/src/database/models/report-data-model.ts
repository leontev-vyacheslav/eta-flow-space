import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'report',
    freezeTableName: true,
    timestamps: true,
})
export class ReportDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING(64),
        allowNull: false,
    })
    declare code: string;

    @Column({
        type: DataType.STRING(128),
        allowNull: false,
    })
    declare description: string;

    @ForeignKey(() => DeviceDataModel)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare deviceId: number | null;

    @BelongsTo(() => DeviceDataModel, 'deviceId')
    declare device?: DeviceDataModel;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare url: string;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    declare settings: Record<string, any> | null;
}
