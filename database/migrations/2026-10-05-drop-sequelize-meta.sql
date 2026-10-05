-- The bookkeeping table of the sequelize-cli migrations that lived in Node-RED (flow-space/src/orm),
-- removed in ec32b7f. Nothing reads it; schema.sql no longer contains it.
DROP TABLE IF EXISTS public."SequelizeMeta";
