#!/bin/bash

# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#sudo yum-config-manager --enable epel
#sudo yum update -y
#sudo yum install git libpng-devel libcurl-devel gcc python-devel libjpeg-devel -y
#sudo pip install --upgrade pip
#alias sudo='sudo env PATH=$PATH'
#sudo  pip install --upgrade setuptools
#sudo pip install --upgrade virtualenv

# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name
# source-bucket-base-name should be the base name for the S3 bucket location where the template will source the Lambda code from. 
# The template will append '-[region_name]' to this bucket name.
# For example: ./build-s3-dist.sh solutions
# The template will then expect the source code to be located in the solutions-[region_name] bucket

# Check to see if input has been provided:
if [ -z "$1" ]; then
    echo "Please provide the base source bucket name where the lambda code will eventually reside.\nFor example: ./build-s3-dist.sh solutions"
    exit 1
fi

# Build source
echo "Staring to build distribution"
echo "mkdir -p dist"
mkdir -p dist
echo "cp -f serverless-image-handler.template dist"
cp -f serverless-image-handler.template dist
echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i '' -e $replace dist/serverless-image-handler.template"
sed -i '' -e $replace dist/serverless-image-handler.template
cd dist
pwd
echo "virtualenv env"
virtualenv env
echo "source env/bin/activate"
source env/bin/activate
cd ../..
pwd
echo "pip install source/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install source/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/
echo "pip install -r source/requirements.txt --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install -r source/requirements.txt --target=$VIRTUAL_ENV/lib/python2.7/site-packages/
cd $VIRTUAL_ENV
pwd
echo "git clone git://github.com/pornel/pngquant.git pngquant_s"
git clone git://github.com/pornel/pngquant.git pngquant_s
cd pngquant_s
pwd
echo "./configure --enable-static --disable-shared"
./configure --enable-static --disable-shared
echo "make"
make
echo "cp pngquant $VIRTUAL_ENV"
cp -f pngquant $VIRTUAL_ENV
cd $VIRTUAL_ENV/lib/python2.7/site-packages
pwd
echo "zip -q -r9 $VIRTUAL_ENV/../serverless-image-handler.zip *"
zip -q -r9 $VIRTUAL_ENV/../serverless-image-handler.zip *
cd $VIRTUAL_ENV
pwd
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip pngquant"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip pngquant
cd ..
echo  zip -d serverless-image-handler.zip botocore*
zip -q -d serverless-image-handler.zip pip*
zip -q -d serverless-image-handler.zip easy*
echo "Clean up build material"
rm -rf $VIRTUAL_ENV
echo "Completed building distribution"
