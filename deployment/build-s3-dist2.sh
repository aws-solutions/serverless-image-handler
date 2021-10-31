#!/usr/bin/env bash
set -e

title() {
    echo "------------------------------------------------------------------------------"
    echo $*
    echo "------------------------------------------------------------------------------"
}

run() {
    >&2 echo "[run] $*"
    $*
}

__dir="$(cd "$(dirname $0)";pwd)"
SRC_PATH="${__dir}/../source"
CDK_OUT_PATH="${__dir}/cdk.out"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Parameters not enough"
    echo "Example: $(basename $0) <BUCKET_NAME> <SOLUTION_NAME> [VERSION]"
    exit 1
fi

export BUCKET_NAME=$1
export SOLUTION_NAME=$2
if [ -z "$3" ]; then
    # export VERSION="v$(jq -r '.version' ${SRC_PATH}/version.json)"
    export VERSION=$(git describe --tags || echo latest)
else
    export VERSION=$3
fi
export GLOBAL_S3_ASSETS_PATH="${__dir}/global-s3-assets"
export REGIONAL_S3_ASSETS_PATH="${__dir}/regional-s3-assets"

title "init env"

run rm -rf ${GLOBAL_S3_ASSETS_PATH} && run mkdir -p ${GLOBAL_S3_ASSETS_PATH}
run rm -rf ${REGIONAL_S3_ASSETS_PATH} && run mkdir -p ${REGIONAL_S3_ASSETS_PATH}
run rm -rf ${CDK_OUT_PATH}

echo "BUCKET_NAME=${BUCKET_NAME}"
echo "SOLUTION_NAME=${SOLUTION_NAME}"
echo "VERSION=${VERSION}"
echo "${VERSION}" > ${GLOBAL_S3_ASSETS_PATH}/version

title "cdk synth"

run cd ${SRC_PATH}/constructs
run yarn

export USE_BSS=true
export BSS_TEMPLATE_BUCKET_NAME="${BUCKET_NAME}"
export BSS_FILE_ASSET_BUCKET_NAME="${BUCKET_NAME}-\${AWS::Region}"
export BSS_FILE_ASSET_PREFIX="${SOLUTION_NAME}/${VERSION}/"
export BSS_FILE_ASSET_REGION_SET="us-east-1,${BSS_FILE_ASSET_REGION_SET}"

run npm run synth -- --output ${CDK_OUT_PATH}
run ${__dir}/helper.py ${CDK_OUT_PATH}

title "tips!"

echo "To test your cloudformation template"
echo "make sure you have the following bucket exists in your account"
echo " - ${BUCKET_NAME}"
echo ${BSS_FILE_ASSET_REGION_SET} | tr ',' '\n' | xargs -I {} echo " - ${BUCKET_NAME}-{}"
echo "run \`aws s3 cp --recursive ${GLOBAL_S3_ASSETS_PATH} s3://${BUCKET_NAME}/${SOLUTION_NAME}/${VERSION}\`"
echo "run \`echo \"${BSS_FILE_ASSET_REGION_SET}\" | tr ',' '\n' | xargs -t -I {} aws s3 cp --recursive --region {} ${REGIONAL_S3_ASSETS_PATH} s3://${BUCKET_NAME}-{}/${SOLUTION_NAME}/${VERSION}\`"
