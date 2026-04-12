#!/bin/sh
# Docker entrypoint script - fixes permissions and starts app
# Runs as root initially, then drops to openqa user

# Fix permissions on data directory (crucial for Docker volumes)
mkdir -p /app/data
chmod 777 /app/data
chown -R openqa:openqa /app/data 2>/dev/null || true

# Also fix permissions on dist (needed for some operations)
chown -R openqa:openqa /app/dist 2>/dev/null || true

# Execute the main command as openqa user
# This ensures the app runs securely, not as root
exec su-exec openqa "$@"

