import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany, HasOne } from 'sequelize-typescript';
import { FlowDataModel } from './flow.data-model';
import { ObjectLocationDataModel } from './object-location.data-model';
import { DeviceStateDataModel } from './device-state.data-model';
import { EmergencyStateDataModel } from './emergency-state.data-model';
import { EmergencyDataModel } from './emergency.data-model';
import { UserDeviceLinkDataModel } from './user-device-link.data-model';

@Table({
    tableName: 'device',
    freezeTableName: true,
    timestamps: true,
})
export class DeviceDataModel extends Model {
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

    @ForeignKey(() => FlowDataModel)
    @Column(DataType.INTEGER)
    declare flowId: number;

    @BelongsTo(() => FlowDataModel, 'flowId')
    declare flow?: FlowDataModel;

    @ForeignKey(() => ObjectLocationDataModel)
    @Column(DataType.INTEGER)
    declare objectLocationId: number;

    @BelongsTo(() => ObjectLocationDataModel, 'objectLocationId')
    declare objectLocation?: ObjectLocationDataModel;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    declare settings: Record<string, any>;

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

    @HasMany(() => DeviceStateDataModel, 'deviceId')
    declare states?: DeviceStateDataModel[];

    @HasMany(() => EmergencyStateDataModel, 'deviceId')
    declare emergencyStates?: EmergencyStateDataModel[];

    @HasMany(() => UserDeviceLinkDataModel, 'deviceId')
    declare userDeviceLinks?: UserDeviceLinkDataModel[];

    @HasOne(() => EmergencyDataModel, 'deviceId')
    declare emergencies?: EmergencyDataModel;
}
