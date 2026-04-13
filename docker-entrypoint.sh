#!/bin/bash
# Docker entrypoint — fixes volume permissions then drops to openqa user via gosu
# Runs as root initially so it can chown the mounted data volume.
#
# DATA_PATH mirrors DB_PATH's parent directory (defaults to /data).
# Override with:  -e DATA_PATH=/custom/path

set -e

DATA_PATH="${DATA_PATH:-/data}"

# Ensure data directory exists and is writable by the openqa user
mkdir -p "${DATA_PATH}"
chown -R openqa:openqa "${DATA_PATH}" 2>/dev/null || true
chmod 755 "${DATA_PATH}"

# Hand off to the app as the unprivileged openqa user
exec gosu openqa "$@"
