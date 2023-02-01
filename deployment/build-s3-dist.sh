#!/bin/bash
#
# The script is for aws-solutions internal purposes only
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh trademarked-solution-name source-bucket-base-name version-code
#
# For example: ./build-s3-dist.sh my-solution solutions v1.0.0
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#  - trademarked-solution-name: name of the solution for consistency
#  - version-code: version of the package

[ "$DEBUG" == 'true' ] && set -x
set -e

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh trademarked-solution-name solutions v1.0.0"
    exit 1
fi

function headline(){
  echo "------------------------------------------------------------------------------"
  echo "$1"
  echo "------------------------------------------------------------------------------"
}

headline "[Init] Setting up paths and variables"
solution_name="$1"
asset_bucket="$2"
solution_version="$3"
template_dir="$PWD"
staging_dist_dir="$template_dir/staging"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"
cdk_source_dir="$source_dir/constructs"

headline "[Init] Clean old folders"
rm -rf "$staging_dist_dir"
mkdir -p "$staging_dist_dir"
rm -rf "$template_dist_dir"
mkdir -p "$template_dist_dir"
rm -rf "$build_dist_dir"
mkdir -p "$build_dist_dir"

headline "[Build] Synthesize cdk template and assets"
cd "$cdk_source_dir"
npm run clean:install
overrideWarningsEnabled=false npx cdk synth --asset-metadata false --path-metadata --output="$staging_dist_dir"
cd "$staging_dist_dir"
rm tree.json manifest.json cdk.out ./*.assets.json
cp "$staging_dist_dir"/*.template.json "$template_dist_dir"/
rm ./*.template.json

headline "[Package] Generate public template"
# Run the helper to clean-up the templates and remove unnecessary CDK elements
cd "$template_dir"
npx ts-node "$template_dir"/cdk-solution-helper/template-builder/index "$template_dist_dir" "$solution_name" "$asset_bucket" "$solution_version"

headline "[Package] Generate public assets for lambda and ui"
npx ts-node "$template_dir"/cdk-solution-helper/asset-package/index "$staging_dist_dir" "$build_dist_dir"
