#!/bin/sh
# Copies the eta24.ru certificate that win-acme renews on the IIS server (exported there as PEM files)
# to ./certs for the gateway, and reloads the gateway when it changed.
# Settings: sync-cert.env next to this script (see sync-cert.env.example).
# Run it from the host's cron once a day, e.g.:
#   30 15 * * * /opt/eta-flow-space/sync-cert.sh >> /opt/eta-flow-space/sync-cert.log 2>&1

set -eu

DIR=$(cd "$(dirname "$0")" && pwd)
. "$DIR/sync-cert.env"

CERT_HOSTNAME=${CERT_HOSTNAME:-eta24.ru}
GATEWAY_CONTAINER=${GATEWAY_CONTAINER:-eta-flow-space-gateway}
CERTS_DIR="$DIR/certs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
    log "ERROR: $*" >&2
    exit 1
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 1. fetch (win-acme names: <host>-chain.pem = certificate + intermediate, <host>-key.pem = private key)
for f in chain key; do
    scp -q -o BatchMode=yes -o ConnectTimeout=20 \
        "$CERT_SOURCE_USER@$CERT_SOURCE_HOST:$CERT_SOURCE_DIR/$CERT_HOSTNAME-$f.pem" "$TMP/$f.pem" \
        || fail "could not fetch $CERT_HOSTNAME-$f.pem from $CERT_SOURCE_HOST; the current certificate is kept"
done

# 2. check before use, so a broken or wrong file never reaches the gateway
openssl x509 -in "$TMP/chain.pem" -noout 2>/dev/null \
    || fail "fetched certificate is not a valid PEM certificate; the current one is kept"
openssl x509 -in "$TMP/chain.pem" -noout -checkend 0 >/dev/null \
    || fail "fetched certificate has expired; the current one is kept"
openssl x509 -in "$TMP/chain.pem" -noout -checkhost "$CERT_HOSTNAME" | grep -q "does match" \
    || fail "fetched certificate is not for $CERT_HOSTNAME; the current one is kept"
cert_pubkey=$(openssl x509 -in "$TMP/chain.pem" -noout -pubkey)
key_pubkey=$(openssl pkey -in "$TMP/key.pem" -pubout 2>/dev/null) \
    || fail "fetched private key is not readable (password protected?); the current certificate is kept"
[ "$cert_pubkey" = "$key_pubkey" ] \
    || fail "fetched private key does not belong to the certificate; the current one is kept"

# 3. install only when it changed
if cmp -s "$TMP/chain.pem" "$CERTS_DIR/fullchain.pem" && cmp -s "$TMP/key.pem" "$CERTS_DIR/privkey.pem"; then
    log "certificate unchanged ($(openssl x509 -in "$TMP/chain.pem" -noout -enddate))"
    exit 0
fi

mkdir -p "$CERTS_DIR"
for f in fullchain privkey; do
    [ -f "$CERTS_DIR/$f.pem" ] && cp -p "$CERTS_DIR/$f.pem" "$CERTS_DIR/$f.pem.prev"
done
install -m 644 "$TMP/chain.pem" "$CERTS_DIR/fullchain.pem.new"
install -m 600 "$TMP/key.pem" "$CERTS_DIR/privkey.pem.new"
mv "$CERTS_DIR/fullchain.pem.new" "$CERTS_DIR/fullchain.pem"
mv "$CERTS_DIR/privkey.pem.new" "$CERTS_DIR/privkey.pem"
log "certificate installed ($(openssl x509 -in "$CERTS_DIR/fullchain.pem" -noout -enddate))"

# 4. reload the gateway (no downtime); if it rejects the new files, put the previous ones back
if [ "$(docker inspect -f '{{.State.Running}}' "$GATEWAY_CONTAINER" 2>/dev/null)" != "true" ]; then
    log "gateway container $GATEWAY_CONTAINER is not running; it will use the new certificate when it starts"
    exit 0
fi
if docker exec "$GATEWAY_CONTAINER" nginx -t >/dev/null 2>&1; then
    docker exec "$GATEWAY_CONTAINER" nginx -s reload
    log "gateway reloaded"
else
    for f in fullchain privkey; do
        [ -f "$CERTS_DIR/$f.pem.prev" ] && mv "$CERTS_DIR/$f.pem.prev" "$CERTS_DIR/$f.pem"
    done
    fail "gateway rejected the new certificate files; the previous ones were restored"
fi
