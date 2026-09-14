#!/bin/bash
if systemctl --user is-active --quiet ssh-tunnel; then
    echo "Stopping SSH tunnel..."
    systemctl --user stop ssh-tunnel
else
    echo "Starting SSH tunnel..."
    systemctl --user start ssh-tunnel
fi