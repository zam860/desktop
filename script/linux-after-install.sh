#!/bin/bash

set -e

PROFILE_D_FILE="/etc/profile.d/github-desktop.sh"
INSTALL_DIR="/opt/${productFilename}"
SHELL_SCRIPT_PATH="$INSTALL_DIR/resources/app/static/"
SCRIPT=$"#!/bin/sh
export PATH=\"$SHELL_SCRIPT_PATH:\$PATH\""

case "$1" in
    configure)
      echo "$SCRIPT" > "${PROFILE_D_FILE}";
      . "${PROFILE_D_FILE}";
    ;;

    abort-upgrade|abort-remove|abort-deconfigure)
    ;;

    *)
      echo "postinst called with unknown argument \`$1'" >&2
      exit 1
    ;;
esac

exit 0
