#!/bin/bash
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh
#

[ "$DEBUG" == 'true' ] && set -x
set -e

function headline(){
  echo "------------------------------------------------------------------------------"
  echo "$1"
  echo "------------------------------------------------------------------------------"
}

headline "[Setup] Configure paths"
template_dir="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cdk_dir="$template_dir/../source/constructs"
image_handler_dir="$template_dir/../source/image-handler"
custom_resource_dir="$template_dir/../source/custom-resource"

headline "[Tests] Run unit tests"
declare -a packages=(
  "$cdk_dir"
  "$image_handler_dir"
  "$custom_resource_dir"
)
for package in "${packages[@]}"; do
  cd "$package"
  npm test
done;

