#!/bin/sh

set -e

echo "yarn cache located at: $(yarn cache dir)"
echo "current dir: $(pwd)"

yarn
yarn build:prod
yarn run package
