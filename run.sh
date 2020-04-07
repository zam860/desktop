#!/bin/sh

set -e

mkdir -p /tmp/local/.cache
mkdir -p /tmp/local/.node-gyp
mkdir -p /tmp/local/.local

docker build . -t desktop-linux-snapcraft

docker run \
  -v /tmp/local/.cache:/usr/local/share/.cache \
  -v /tmp/local/.node-gyp:/.node-gyp \
  -v /tmp/local/.local:/.local \
  desktop-linux-snapcraft
