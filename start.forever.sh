#!/bin/bash -eu

. "${NVM_DIR}/nvm.sh"
. version.sh

service=seagull

nvm ls "${START_NODE_VERSION}" > /dev/null || { echo "ERROR: Node version ${START_NODE_VERSION} not installed"; exit 1; }
nvm use --delete-prefix "${START_NODE_VERSION}"

. config/env.sh

forever -a -o ../$service.log -e ../$service.error.log --uid $service start lib/index.js
