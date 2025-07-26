#!/bin/bash

# Oscar Chat - Hosts File Setup Script

HOSTS_FILE="/etc/hosts"
BACKUP_FILE="/etc/hosts.backup.$(date +%Y%m%d)"

echo "Oscar Chat - Local Development Setup"
echo "===================================="
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script needs to modify /etc/hosts and requires sudo access."
    echo "Please run: sudo ./setup-hosts.sh"
    exit 1
fi

# Create backup
echo "Creating backup of hosts file..."
cp "$HOSTS_FILE" "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"
echo

# Check if entries already exist
if grep -q "oscar-chat.local" "$HOSTS_FILE"; then
    echo "Oscar Chat entries already exist in hosts file."
    echo "Skipping setup."
    exit 0
fi

# Add entries
echo "Adding Oscar Chat entries to hosts file..."
cat >> "$HOSTS_FILE" << 'EOF'

# Oscar Chat local development
127.0.0.1 oscar-chat.local
127.0.0.1 acme.oscar-chat.local
127.0.0.1 test-org.oscar-chat.local
127.0.0.1 demo.oscar-chat.local
127.0.0.1 my-company.oscar-chat.local
EOF

echo "Hosts file updated successfully!"
echo
echo "You can now access:"
echo "  - Main app: http://oscar-chat.local:3000"
echo "  - Test orgs: http://acme.oscar-chat.local:3000"
echo
echo "To remove these entries later, restore from backup:"
echo "  sudo cp $BACKUP_FILE $HOSTS_FILE"
echo

# Flush DNS cache (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Flushing DNS cache..."
    dscacheutil -flushcache
    echo "DNS cache flushed."
fi

echo "Setup complete!"