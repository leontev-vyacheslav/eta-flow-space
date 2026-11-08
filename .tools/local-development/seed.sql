-- Synthetic local development fixtures only. Never apply this file to production.
BEGIN;
DO $$
BEGIN
    IF current_database() <> 'eta_flow_space_local' THEN
        RAISE EXCEPTION 'Demo fixtures require eta_flow_space_local';
    END IF;
    IF EXISTS (SELECT 1 FROM public."user") OR EXISTS (SELECT 1 FROM public.device) THEN
        RAISE EXCEPTION 'Demo fixtures require an empty application database';
    END IF;
END;
$$;

-- Public local password for both accounts: demo-local-only (bcrypt, cost 10).
INSERT INTO public."user" (name, password, "roleId", settings, "createdAt", "updatedAt")
SELECT name, '$2b$10$h9CJrzXloYrgRP4GCN//iONT8VW5pQd.MoH7BO1ORau92erR.VEfO', role,
       '{"isShowedAllDevices":true}', now(), now()
FROM (VALUES ('demo-admin', 1), ('demo-viewer', 3)) AS accounts(name, role);

INSERT INTO public.object_location (latitude, longitude, address, locality, "createdAt", "updatedAt")
VALUES (55.79, 49.12, 'Демонстрационная улица, 1', 'г. Казань', now(), now());

-- Reuse an existing diagram code, with entirely fictional names and measurements.
INSERT INTO public.flow (code, name, description, "createdAt", "updatedAt")
VALUES ('spring1-boiler-room', 'ДЕМО: котельная', 'Синтетические данные для разработки', now(), now());

INSERT INTO public.device (code, name, description, "flowId", "objectLocationId", settings,
                           "updateStateInterval", "order", "createdAt", "updatedAt")
SELECT 'spring1-boiler-room', 'ДЕМО: котельная', 'Локальный макет без подключения к оборудованию',
       f.id, l.id, '{"stateTtl":10}', 10, 1, now(), now()
FROM public.flow f CROSS JOIN public.object_location l;

INSERT INTO public.user_device_link ("userId", "deviceId", "createdAt", "updatedAt")
SELECT u.id, d.id, now(), now() FROM public."user" u CROSS JOIN public.device d;

INSERT INTO public.mnemoschema_selector ("deviceId", "sourceDeviceId", "createdAt", "updatedAt")
SELECT id, id, now(), now() FROM public.device;

-- 25 hourly samples, including one recent sample. The API displays these through
-- its database fallback, marked offline because there is no live Redis state.
WITH sensors AS (
    SELECT jsonb_object_agg(name, false) AS flags
    FROM unnest(ARRAY[
        'isPressInNetSensorError', 'isPressInNetHighLevel', 'isPressInNetPreHighLevel',
        'isPressInNetPreLowLevel', 'isPressInNetLowLevel', 'isPressOutNetSensorError',
        'isPressOutHighLevel', 'isPressOutPreHighLevel', 'isPressOutPreLowLevel',
        'isPressOutLowLevel', 'isTempInNetSensorError', 'isTempInNetHighLevel',
        'isTempInNetPreHighLevel', 'isTempInNetPreLowLevel', 'isTempInNetLowLevel',
        'isTempOutNetSensorError', 'isTempOutNetHighLevel', 'isTempOutNetPreHighLevel',
        'isTempOutNetPreLowLevel', 'isTempOutNetLowLevel'
    ]) AS names(name)
), boilers AS (
    SELECT jsonb_agg(jsonb_build_object(
        'state', 0, 'tempOut', 72, 'tempFlueGases', 110,
        'isBurnerFailure', false, 'isWorking', false,
        'isGasRelayPressure', false, 'isMinWaterPressure', false,
        'isMaxWaterPressure', false, 'isMaxWaterTemperature', false, 'isFlowRelay', false,
        'statusTempOutSensor', 0, 'statusTempFlueGasesSensor', 0
    )) AS items FROM generate_series(1, 4)
), pumps AS (
    SELECT jsonb_agg(jsonb_build_object(
        'state', 0, 'status', 0, 'mode', 0, 'isDryRun', false, 'isAlarm', false,
        'current', 0, 'frequency', 0, 'operatingTime', 120
    )) AS items FROM generate_series(1, 3)
)
INSERT INTO public.device_state ("deviceId", "createdAt", "updatedAt", state)
SELECT d.id, now() - sample * interval '1 hour', now() - sample * interval '1 hour',
       jsonb_build_object(
           'tempOutAir', round((5 + sin(sample / 4.0))::numeric, 1),
           'tempInNet', round((72 + 3 * sin(sample / 3.0))::numeric, 1),
           'tempOutNet', round((54 + 2 * sin(sample / 3.0))::numeric, 1),
           'pressInNet', 4.2, 'pressOutNet', 3.5,
           'isCO', false, 'isCH', false, 'isSecurityAlarm', false, 'isFireAlarm', false,
           'isAlarmThreeWayValve', false, 'isAlarmStopAsmNetworkPumps', false,
           'isAlarmAsmNetworkPumps', false, 'isWorkingAsmNetworkPumps', false,
           'threewayValve', jsonb_build_object('status', 0),
           'sensors', sensors.flags, 'boilers', boilers.items,
           'sourceWaterPumps', '[{"isWorking":false,"isAlarm":false}]'::jsonb,
           'boilerPumps', '[{"isFailure":false},{"isFailure":false},{"isFailure":false},{"isFailure":false}]'::jsonb,
           'networkPumps', pumps.items,
           'timestamp', extract(epoch FROM now() - sample * interval '1 hour')::bigint * 1000
       )
FROM public.device d CROSS JOIN generate_series(0, 24) AS samples(sample)
CROSS JOIN sensors CROSS JOIN boilers CROSS JOIN pumps;
COMMIT;
