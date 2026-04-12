#!/bin/sh
# Docker entrypoint script - fixes permissions and starts app

# Fix permissions on data directory (crucial for Docker volumes)
if [ -d "/app/data" ]; then
    chmod 777 /app/data
fi

# Create data directory if it doesn't exist with proper permissions
mkdir -p /app/data
chmod 777 /app/data

# Ensure the database file can be created
# LowDB/SQLite need write access to the directory

# Execute the main command
exec "$@"
