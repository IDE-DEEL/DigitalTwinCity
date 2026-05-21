#!/bin/sh
set -e

# Install openssl in the alpine container
apk add --no-cache openssl >/dev/null
mkdir -p /certs

POSTGRES_UID="${POSTGRES_UID:-70}"
POSTGRES_GID="${POSTGRES_GID:-70}"

fix_permissions() {
  # The official postgres alpine images run as UID/GID 70. The private key
  # must be readable by that user and inaccessible to group/world.
  for file in /certs/server.key /certs/server.crt /certs/ca.crt /certs/ca.key /certs/server.cnf; do
    [ -e "$file" ] && chown "$POSTGRES_UID:$POSTGRES_GID" "$file"
  done
  [ -e /certs/server.key ] && chmod 600 /certs/server.key
  [ -e /certs/ca.key ] && chmod 600 /certs/ca.key
  [ -e /certs/server.crt ] && chmod 644 /certs/server.crt
  [ -e /certs/ca.crt ] && chmod 644 /certs/ca.crt
  [ -e /certs/server.cnf ] && chmod 644 /certs/server.cnf
}

# Idempotent: if certs already exist, only repair permissions.
if [ -f /certs/ca.crt ] && [ -f /certs/server.crt ] && [ -f /certs/server.key ]; then
  echo "PostgreSQL TLS certs already exist in volume."
  fix_permissions
  exit 0
fi

echo "Generating internal CA + server cert (SAN: localhost, 127.0.0.1, postgres) ..."

openssl genrsa -out /certs/ca.key 4096
openssl req -x509 -new -nodes -key /certs/ca.key -sha256 -days 825 \
  -subj "/C=NL/O=DigitalTwin/OU=CSC/CN=dt-postgres-ca" \
  -out /certs/ca.crt

openssl genrsa -out /certs/server.key 2048
cat > /certs/server.cnf <<'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = NL
O = DigitalTwin
OU = CSC
CN = postgres

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = postgres
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

openssl req -new -key /certs/server.key -out /certs/server.csr -config /certs/server.cnf
openssl x509 -req -in /certs/server.csr -CA /certs/ca.crt -CAkey /certs/ca.key -CAcreateserial \
  -out /certs/server.crt -days 825 -sha256 -extensions v3_req -extfile /certs/server.cnf

rm -f /certs/server.csr /certs/ca.srl

fix_permissions

echo "Done."
