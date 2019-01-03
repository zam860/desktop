#!/usr/bin/env bash
#
# Adapted from the Visual Studio Code command line shim found at:
# https://github.com/Microsoft/vscode/blob/750ed368d2d8cd1820dd81a49653f2f6b1ab968b/resources/linux/bin/code.sh

# If root, ensure that --user-data-dir or --file-write is specified
if [ "$(id -u)" = "0" ]; then
	for i in $@
	do
		if [[ $i == --user-data-dir || $i == --user-data-dir=* || $i == --file-write ]]; then
			CAN_LAUNCH_AS_ROOT=1
		fi
	done
	if [ -z $CAN_LAUNCH_AS_ROOT ]; then
		echo "You are trying to start GitHub Desktop as a super user which is not recommended. If you really want to, you must specify an alternate user data directory using the --user-data-dir argument." 1>&2
		exit 1
	fi
fi

if [ ! -L $0 ]; then
	# if path is not a symlink, find relatively
	DESKTOP_PATH="$(dirname $0)/../../../"
else
	if which readlink >/dev/null; then
		# if readlink exists, follow the symlink and find relatively
		DESKTOP_PATH="$(dirname $(readlink -f $0))/.."
	else
		# else use the standard install location
		DESKTOP_PATH="/opt/GitHub\ Desktop"
	fi
fi

ELECTRON="$DESKTOP_PATH/github-desktop"
CLI="$DESKTOP_PATH/resources/app/cli.js"
ELECTRON_RUN_AS_NODE=1 "$ELECTRON" "$CLI" "$@"
exit $?

