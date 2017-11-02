#!/usr/bin/env bash

# strict mode
set -euo pipefail

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
echo "Staring to build distribution"
echo "export deployment_dir=$(pwd)"
deployment_dir=$(pwd)
export deployment_dir
echo "mkdir -p dist"
mkdir -p dist
echo "cp -f serverless-image-handler.template dist"
cp -f serverless-image-handler.template dist
echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i'' -e $replace dist/serverless-image-handler.template"
sed -i'' -e "$replace" dist/serverless-image-handler.template
echo "Creating UI ZIP file"
cd "$deployment_dir/../source/ui" || exit 1
zip -q -r9 "$deployment_dir/dist/serverless-image-handler-ui.zip" ./*
echo "Building custom resource package ZIP file"
cd "$deployment_dir/dist" || exit 1
pwd
echo "virtualenv env"
virtualenv env
echo "VIRTUAL_ENV_DISABLE_PROMPT=true source env/bin/activate"
VIRTUAL_ENV_DISABLE_PROMPT=true source env/bin/activate
echo "pip install $deployment_dir/../source/image-handler-custom-resource/. --target=$deployment_dir/dist/env/lib/python2.7/site-packages/"
pip install "$deployment_dir/../source/image-handler-custom-resource/." --target="$deployment_dir/dist/env/lib/python2.7/site-packages/"
cd "$deployment_dir/dist/env/lib/python2.7/site-packages/" || exit 1
zip -r9 "$deployment_dir/dist/serverless-image-handler-custom-resource.zip" ./*
cd "$deployment_dir/dist" || exit 1
zip -q -d serverless-image-handler-custom-resource.zip pip*
zip -q -d serverless-image-handler-custom-resource.zip easy*
rm -rf env
echo "Building Image Handler package ZIP file"
cd "$deployment_dir/dist" || exit 1
pwd
echo "virtualenv env"
virtualenv env
echo "VIRTUAL_ENV_DISABLE_PROMPT=true source env/bin/activate"
VIRTUAL_ENV_DISABLE_PROMPT=true source env/bin/activate
cd ../.. || exit 1
pwd
echo "pip install source/image-handler/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install source/image-handler/. --target="$VIRTUAL_ENV/lib/python2.7/site-packages/"
echo "pip install -r source/image-handler/requirements.txt --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install -r source/image-handler/requirements.txt --target="$VIRTUAL_ENV/lib/python2.7/site-packages/"
cd "$VIRTUAL_ENV" || exit 1
pwd
echo "git clone git://github.com/pornel/pngquant.git pngquant_s"
git clone https://github.com/pornel/pngquant.git pngquant_s
cd pngquant_s || exit 1
pwd
echo "./configure --enable-static --disable-shared"
./configure --enable-static --disable-shared
echo "make"
make
echo "cp pngquant $VIRTUAL_ENV"
cp -f pngquant "$VIRTUAL_ENV"
cd "$VIRTUAL_ENV/lib/python2.7/site-packages" || exit 1
pwd
echo "zip -q -r9 $VIRTUAL_ENV/../serverless-image-handler.zip *"
zip -q -r9 "$VIRTUAL_ENV/../serverless-image-handler.zip" ./*
cd "$VIRTUAL_ENV" || exit 1
pwd
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip pngquant"
zip -q -g "$VIRTUAL_ENV/../serverless-image-handler.zip" pngquant
cd ..
zip -q -d serverless-image-handler.zip pip*
zip -q -d serverless-image-handler.zip easy*
echo "Clean up build material"
rm -rf "$VIRTUAL_ENV"
echo "Completed building distribution"
