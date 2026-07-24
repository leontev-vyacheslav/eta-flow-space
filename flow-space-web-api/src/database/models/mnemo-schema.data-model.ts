import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'mnemoschema',
    freezeTableName: true,
    timestamps: true,
})
export class MnemoSchemaDataModel extends Model {
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
        type: DataType.STRING(255),
        allowNull: true,
    })
    declare description: string;

    @HasMany(() => DeviceDataModel, 'mnemoschemaId')
    declare devices?: DeviceDataModel[];
}
