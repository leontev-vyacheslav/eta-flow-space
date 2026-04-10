import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from 'sequelize-typescript';
import { UserDeviceLinkDataModel } from './user-device-link.data-model';

@Table({
    tableName: 'user',
    freezeTableName: true,
    timestamps: false,
})
export class UserDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.STRING(128),
        allowNull: false,
    })
    declare password: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare roleId: number;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    declare settings: Record<string, any>;

    @HasMany(() => UserDeviceLinkDataModel, 'userId')
    declare userDeviceLinks?: UserDeviceLinkDataModel[];
}
