import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserDataModel } from './user.data-model';
import { DeviceDataModel } from './device.data-model';

@Table({
    tableName: 'user_device_link',
    freezeTableName: true,
    timestamps: true,
})
export class UserDeviceLinkDataModel extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => UserDataModel)
    @Column(DataType.INTEGER)
    declare userId: number;

    @BelongsTo(() => UserDataModel, 'userId')
    declare user?: UserDataModel;

    @ForeignKey(() => DeviceDataModel)
    @Column(DataType.INTEGER)
    declare deviceId: number;

    @BelongsTo(() => DeviceDataModel, 'deviceId')
    declare device?: DeviceDataModel;
}
