#! /bin/bash

mkdir -p /tmp/local/.yarn \
    /tmp/local/.cache \
    /tmp/local/.local \
    /tmp/local/.node-gyp

docker build -f $PWD/script/docker/trusty.Dockerfile -t shiftkey/desktop:trusty-node-yarn-git .

docker run -u $(id -u):$(id -g) \
    -w /src \
    -v "$(pwd)":/src \
    -v /tmp/local/.yarn:/.yarn \
    -v /tmp/local/.cache:/.cache \
    -v /tmp/local/.local:/.local \
    -v /tmp/local/.node-gyp:/.node-gyp \
    shiftkey/desktop:trusty-node-yarn-git \
    sh -c "yarn install --force && yarn build:prod"

docker build -f $PWD/script/docker/snapcraft.Dockerfile -t shiftkey/desktop:snapcraft-node-yarn .

docker run \
    -w /src \
    -v "$(pwd)":/src \
    -v /tmp/local/.yarn:/.yarn \
    -v /tmp/local/.local:/.local \
    -v /tmp/local/.cache:/.cache \
    -v /tmp/local/.node-gyp:/.node-gyp \
    shiftkey/desktop:snapcraft-node-yarn sh -c "yarn run package"
