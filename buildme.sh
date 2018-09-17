#!/bin/bash

set -eu
EXTRA_ARGS=""

if [[ $# -gt 0 ]]; then
    EXTRA_ARGS="-e BUCKET_BASE_NAME=$1"
fi

docker run -v `PWD`:/build $EXTRA_ARGS northwoods/serverless-image-handler-builder 
