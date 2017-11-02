#!/usr/bin/env bash

# strict mode
set -euxo pipefail

# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# On CentOS:
# sudo yum -y install epel-release
# sudo yum -y install python-pip zip

# On Amazon Linux:
# sudo yum-config-manager --enable epel
#
# On both:
# sudo yum -y update
# sudo yum -y install gcc git libcurl-devel libjpeg-devel libpng-devel python-devel
# sudo pip install --upgrade pip
# alias sudo='sudo env PATH=$PATH'
# sudo pip install --upgrade setuptools
# sudo pip install --upgrade virtualenv

# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name
# source-bucket-base-name should be the base name for the S3 bucket location where the template will source the Lambda code from.
# The template will append '-[region_name]' to this bucket name.
# For example: ./build-s3-dist.sh solutions
# The template will then expect the source code to be located in the solutions-[region_name] bucket

# Check to see if input has been provided:
if [ -z "$1" ]; then
    printf "Please provide the base source bucket name where the lambda code will eventually reside.\nFor example: ./build-s3-dist.sh solutions"
    exit 1
fi

# Build source
printf "Starting to build distribution"
deployment_dir=$(pwd)
export deployment_dir
mkdir -p dist
cp -f serverless-image-handler.template dist

printf "Updating code source bucket in template with %s" "$1"
replace="s/%%BUCKET_NAME%%/$1/g"
sed -i'' -e "$replace" dist/serverless-image-handler.template

printf "Creating UI ZIP file"
cd "$deployment_dir/../source/ui"
zip -q -r9 "$deployment_dir/dist/serverless-image-handler-ui.zip" ./*

printf "Building custom resource package ZIP file"
cd "$deployment_dir/dist"
pwd
virtualenv env
VIRTUAL_ENV_DISABLE_PROMPT=true source env/bin/activate
pip install "$deployment_dir/../source/image-handler-custom-resource/." --target="$deployment_dir/dist/env/lib/python2.7/site-packages/"
cd "$deployment_dir/dist/env/lib/python2.7/site-packages/"
zip -r9 "$deployment_dir/dist/serverless-image-handler-custom-resource.zip" ./*
cd "$deployment_dir/dist"
zip -q -d serverless-image-handler-custom-resource.zip pip*
zip -q -d serverless-image-handler-custom-resource.zip easy*
rm -rf env

printf "Building Image Handler package ZIP file"
cd "$deployment_dir/dist"
pwd
virtualenv env
VIRTUAL_ENV_DISABLE_PROMPT=true source env/bin/activate
cd ../..
pwd
pip install source/image-handler/. --target="$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install -r source/image-handler/requirements.txt --target="$VIRTUAL_ENV/lib/python2.7/site-packages/"
cd "$VIRTUAL_ENV"
pwd
git clone https://github.com/pornel/pngquant.git pngquant_s
cd pngquant_s
pwd
./configure --enable-static --disable-shared
make
cp -f pngquant "$VIRTUAL_ENV"
cd "$VIRTUAL_ENV/lib/python2.7/site-packages"
pwd
zip -q -r9 "$VIRTUAL_ENV/../serverless-image-handler.zip" ./*
cd "$VIRTUAL_ENV"
pwd
zip -q -g "$VIRTUAL_ENV/../serverless-image-handler.zip" pngquant
cd ..
zip -q -d serverless-image-handler.zip pip*
zip -q -d serverless-image-handler.zip easy*

printf "Clean up build material"
rm -rf "$VIRTUAL_ENV"
printf "Completed building distribution"
