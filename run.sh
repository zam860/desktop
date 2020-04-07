#!/bin/sh

set -e

mkdir -p /tmp/local/.cache
mkdir -p /tmp/local/.node-gyp
mkdir -p /tmp/local/.local
mkdir -p /tmp/local/dist

docker build . -t desktop-linux-snapcraft

docker run \
  -v /tmp/local/.cache:/usr/local/share/.cache \
  -v /tmp/local/.node-gyp:/.node-gyp \
  -v /tmp/local/.local:/.local \
  -v /tmp/local/dist:/dist \
  -e CIRCLE_SHA1=$(git rev-parse HEAD) \
  desktop-linux-snapcraft
