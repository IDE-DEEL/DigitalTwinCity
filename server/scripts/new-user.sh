#!/bin/bash
# Script to create a new developer with the correct ACL and permissions.
# Usage: sudo ./new-user.sh <username>

set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/digital-twin}"

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script as root (use sudo)."
  exit 1
fi

USERNAME="${1:-}"

# Check if username parameter is provided
if [ -z "$USERNAME" ]; then
  echo "Usage: $0 <username>"
  echo "Optional: set DEPLOY_ROOT to override ${DEPLOY_ROOT}."
  exit 1
fi

echo "Starting setup for developer: $USERNAME..."

# 1. Ensure the 'team' group exists
getent group team >/dev/null || groupadd team
echo "[OK] Group 'team' verified."

# 2. Set directory permissions for the deployment root ONLY if needed.
# We check if the top-level directory already has owner: root, group: team,
# and permissions: 2770 (770 + setgid).
if [ ! -d "$DEPLOY_ROOT" ]; then
    echo "Error: Deployment root does not exist: $DEPLOY_ROOT"
    exit 1
fi

DIR_STAT=$(stat -c "%U:%G %a" "$DEPLOY_ROOT" 2>/dev/null)

if [ "$DIR_STAT" != "root:team 2770" ]; then
    echo "Permissions not optimal. Updating ${DEPLOY_ROOT} permissions to 2770..."
    
    chown -R root:team "$DEPLOY_ROOT"
    chown -R 1883:team "$DEPLOY_ROOT/shared/mosquitto/password" 2>/dev/null || true
    chmod -R u+rwX,g+rwX,o-rwx "$DEPLOY_ROOT"
    chmod 640 "$DEPLOY_ROOT"/shared/mosquitto/password/* 2>/dev/null || true
    find "$DEPLOY_ROOT" -type d -exec chmod g+s {} \+
    echo "[OK] Permissions for ${DEPLOY_ROOT} updated."
else
    echo "[OK] Permissions for ${DEPLOY_ROOT} are already correct (2770). Skipping recursive update."
fi

# 3. Create user and restrict home directory
if id "$USERNAME" &>/dev/null; then
    echo "User $USERNAME already exists. Updating settings..."
else
    useradd -m -s /bin/bash "$USERNAME"
    passwd -d "$USERNAME"
    echo "[OK] User $USERNAME created."
fi

chmod 700 "/home/$USERNAME"
echo "[OK] Home directory restricted (700)."

# 4. Add user to necessary groups: 'team' and 'docker'
usermod -aG team,docker "$USERNAME"
echo "[OK] User added to 'team' and 'docker' groups."

# 5. Setup SSH directory structure
mkdir -p "/home/$USERNAME/.ssh"
chmod 700 "/home/$USERNAME/.ssh"
touch "/home/$USERNAME/.ssh/authorized_keys"
chmod 600 "/home/$USERNAME/.ssh/authorized_keys"
chown -R "$USERNAME:$USERNAME" "/home/$USERNAME/.ssh"
echo "[OK] SSH directory structure created."

echo ""
echo "=== SETUP COMPLETE ==="
echo "User '$USERNAME' is ready."
echo "Action required: Please paste the user's public SSH key into: /home/$USERNAME/.ssh/authorized_keys"
