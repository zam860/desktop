#!/bin/sh

set -e

echo "yarn cache located at: $(yarn cache dir)"

yarn
yarn build:prod
yarn run package
