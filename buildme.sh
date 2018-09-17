#!/bin/bash

set -eu
export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd ${SCRIPT_DIR}
OUTDIR=${SCRIPT_DIR}/deployment/dist
ARTIFACT=serverless-image-handler
VERSION=${BUILD_NUMBER:-MANUAL}

docker build -t serverless-image-handler .

docker run --rm -v `PWD`:/lambda serverless-image-handler LOLRUS-BUKKIT

aws s3 cp ${OUTDIR}/${ARTIFACT}.zip s3://traverse-lambda-artifacts/${ARTIFACT}-${VERSION}.zip
