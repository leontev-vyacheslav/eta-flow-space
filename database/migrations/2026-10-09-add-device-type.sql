-- Device types: the kinds of controllers and meters the devices are polled from. Names and descriptions follow the
-- wording of the existing devices; settings is for per-type options and stays empty for now. Also links every device
-- to its type (device."deviceTypeId").
BEGIN;

CREATE TABLE public.device_type (
    id serial PRIMARY KEY,
    code character varying(32) NOT NULL CONSTRAINT device_type_code_unique UNIQUE,
    name character varying(32) NOT NULL,
    description character varying(64),
    settings json,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

INSERT INTO public.device_type (code, name, description, "createdAt", "updatedAt") VALUES
    ('modicon', 'Контроллер Modicon', 'Программируемый логический контроллер Schneider Electric Modicon', now(), now()),
    ('siemens', 'Контроллер Siemens', 'Программируемый логический контроллер Siemens', now(), now()),
    ('mercury230', 'Mercury230', 'Электросчетчик Mercury230', now(), now()),
    ('ek270', 'EK270', 'Электронный корректор объема газа EK270', now(), now()),
    ('vkt7', 'ВКТ-7', 'Тепловычислитель ВКТ-7', now(), now()),
    ('km5', 'КМ-5', 'Теплосчетчик КМ-5', now(), now()),
    ('irvis', 'Ирвис', 'Расходомер газа Ирвис', now(), now()),
    ('vzljot026', 'Взлет026', 'Тепловычислитель Взлет026', now(), now());

-- Each device's type; NULL when unknown (the Амирхана demo node has no real device behind it)
ALTER TABLE public.device ADD COLUMN "deviceTypeId" integer;

ALTER TABLE public.device
    ADD CONSTRAINT "device_deviceTypeId_fkey" FOREIGN KEY ("deviceTypeId") REFERENCES public.device_type(id)
        ON UPDATE CASCADE ON DELETE SET NULL;

UPDATE public.device
SET "deviceTypeId" = device_type.id
FROM (VALUES
    ('tsarevo2-boiler-room', 'modicon'),
    ('statum-boiler-room', 'modicon'),
    ('spring2-boiler-room', 'modicon'),
    ('spring-boiler-room', 'modicon'),
    ('tsarevo1-boiler-room', 'siemens'),
    ('mercury230-26077096', 'mercury230'),
    ('mercury230-26077087', 'mercury230'),
    ('spring-ek270-1116061420', 'ek270'),
    ('spring2-vkt-289452', 'vkt7'),
    ('tsarevo1-km5-418200', 'km5'),
    ('spring2-irvis', 'irvis'),
    ('spring-vzljot026-1415796', 'vzljot026')
) AS device_types (device_code, type_code)
JOIN public.device_type ON device_type.code = device_types.type_code
WHERE device.code = device_types.device_code;

COMMIT;
