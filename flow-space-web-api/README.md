# Flow Space Web API

A NestJS-based REST API for the Eta Flow Space

`DevicePoolSyncService` refreshes the shared Redis device cache at API startup and every five minutes.
Each `device:<id>` JSON item includes `objectLocationId` and a nested `objectLocation` with `id`,
`address`, `locality`, `latitude` and `longitude`. Devices without a linked location have
`objectLocation: null`. Coordinates retain PostgreSQL DECIMAL serialization (strings, or `null`
when unset); consumers should validate and convert them to numbers before making weather requests.

