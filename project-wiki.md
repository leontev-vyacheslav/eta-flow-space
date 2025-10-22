## Project  wiki

### 1. I got an error like that:

```shell
Error: EACCES: permission denied, copyfile '/usr/src/node-red/node_modules/node-red/settings.js' -> '/data/settings.js'
```

Inside the Node-RED Docker image:

- Node-RED runs as user node-red (UID 1000), not root (for security).

- On your host, the ./data directory is probably owned by root or another user.

- When the container tries to copy the default settings.js into /data, it gets permission denied.

You can solve this in one of three ways, depending on your preference:

```shell
sudo chown -R 1000:1000 ./data
```
