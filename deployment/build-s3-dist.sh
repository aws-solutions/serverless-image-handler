#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name trademarked-solution-name version-code
#
# Paramenters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#
#  - trademarked-solution-name: name of the solution for consistency
#
#  - version-code: version of the package

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0"
    exit 1
fi

# Exit immediately if a command exits with a non-zero status.
set -e

# Get reference for all important folders
template_dir="$PWD"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"
cdk_source_dir="$source_dir/constructs"

echo "------------------------------------------------------------------------------"
echo "[Init] Clean old dist folders"
echo "------------------------------------------------------------------------------"
echo "rm -rf $template_dist_dir"
rm -rf $template_dist_dir
echo "mkdir -p $template_dist_dir"
mkdir -p $template_dist_dir
echo "rm -rf $build_dist_dir"
rm -rf $build_dist_dir
echo "mkdir -p $build_dist_dir"
mkdir -p $build_dist_dir

echo "------------------------------------------------------------------------------"
echo "Synthesize the CDK project into a CloudFormation template"
echo "------------------------------------------------------------------------------"
export SOLUTION_BUCKET_NAME_PLACEHOLDER=$1
export SOLUTION_NAME_PLACEHOLDER=$2
export SOLUTION_VERSION_PLACEHOLDER=$3
export overrideWarningsEnabled=false

cd $cdk_source_dir
npm run clean
npm install
node_modules/aws-cdk/bin/cdk synth --asset-metadata false --path-metadata false >$template_dist_dir/$2.template

declare -a lambda_packages=(
    "image-handler"
    "custom-resource"
)

for lambda_package in "${lambda_packages[@]}"; do
    echo "------------------------------------------------------------------------------"
    echo "Building Lambda package: $lambda_package"
    echo "------------------------------------------------------------------------------"
    cd $source_dir/$lambda_package
    npm run package
    # Check the result of the package step and exit if a failure is identified
    if [ $? -eq 0 ]; then
        echo "Package for $lambda_package built successfully"
    else
        echo "******************************************************************************"
        echo "Lambda package build FAILED for $lambda_package"
        echo "******************************************************************************"
        exit 1
    fi
    mv dist/package.zip $build_dist_dir/$lambda_package.zip
    rm -rf dist
done

echo "------------------------------------------------------------------------------"
echo "Package Serverless Image Handler Demo UI"
echo "------------------------------------------------------------------------------"
mkdir $build_dist_dir/demo-ui/
cp -r $source_dir/demo-ui/** $build_dist_dir/demo-ui/

echo "------------------------------------------------------------------------------"
echo "[Create] Console manifest"
echo "------------------------------------------------------------------------------"
cd $source_dir/demo-ui
manifest=($(find * -type f ! -iname ".DS_Store"))
manifest_json=$(
    IFS=,
    printf "%s" "${manifest[*]}"
)
echo "{\"files\":[\"$manifest_json\"]}" | sed 's/,/","/g' >>$build_dist_dir/demo-ui-manifest.json
