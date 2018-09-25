#!/bin/bash

# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#sudo yum-config-manager --enable epel
#sudo yum update -y
#sudo yum install git libpng-devel libcurl-devel gcc python-devel libjpeg-devel -y
# pip install --upgrade pip==9.0.3
# alias sudo='sudo env PATH=$PATH'
# pip install --upgrade setuptools==39.0.1
# pip install --upgrade virtualenv==15.2.0
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
echo "Starting to build distribution"
echo "export deployment_dir=`pwd`"
export deployment_dir=`pwd`
echo "mkdir -p dist"
mkdir -p dist
echo "cp -f serverless-image-handler.template dist"
cp -f serverless-image-handler.template dist
echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i '' -e $replace dist/serverless-image-handler.template"
sed -i '' -e $replace dist/serverless-image-handler.template

# SO-SIH-154 - 07/16/2018 - Build fixes
# Adding variable for artifact version
replace="s/%%VERSION%%/$2/g"
echo "sed -i '' -e $replace dist/serverless-image-handler.template"
sed -i '' -e $replace dist/serverless-image-handler.template

echo "Creating UI ZIP file"
cd $deployment_dir/../source/ui
zip -q -r9 $deployment_dir/dist/serverless-image-handler-ui.zip *
echo "Building custom resource package ZIP file"
cd $deployment_dir/dist
pwd
echo "virtualenv --no-site-packages env"
virtualenv --no-site-packages env
echo "source env/bin/activate"
source env/bin/activate
echo "python -m pip install pip==9.0.3"
python -m pip install pip==9.0.3
# SO-SIH-157 - 07/17/2018 - Pip version
# Checking pip version inside virtualenv for debugging
echo "which python pip virtualenv, version"
which python && python --version
which pip && pip --version
which virtualenv && virtualenv --version

# Building custom resource zip
echo "pip install -q $deployment_dir/../source/image-handler-custom-resource/. --target=$deployment_dir/dist/env/lib/python2.7/site-packages/"
pip install -q $deployment_dir/../source/image-handler-custom-resource/. --target=$deployment_dir/dist/env/lib/python2.7/site-packages/
cd $deployment_dir/dist/env/lib/python2.7/site-packages/
zip -r9 $deployment_dir/dist/serverless-image-handler-custom-resource.zip *
cd $deployment_dir/dist
zip -q -d serverless-image-handler-custom-resource.zip pip*
zip -q -d serverless-image-handler-custom-resource.zip easy*
rm -rf env

# Building image handler zip
echo "Building Image Handler package ZIP file"
cd $deployment_dir/dist
pwd
echo "virtualenv --no-site-packages env"
virtualenv --no-site-packages env
echo "source env/bin/activate"
source env/bin/activate
echo "python -m pip install pip==9.0.3"
python -m pip install pip==9.0.3
echo "which python pip virtualenv, version"
which python && python --version
which pip && pip --version
which virtualenv && virtualenv --version

cd ../..
pwd

# SO-SIH-159 - 07/25/2018 - Pycurl ssl backend
# Configuring compile time ssl backend
# https://stackoverflow.com/questions/21096436/ssl-backend-error-when-using-openssl
export PYCURL_SSL_LIBRARY=nss

# to help with debugging
echo "which curl && curl --version"
which curl && curl --version
echo "which curl-config && curl-config --version"
which curl-config && curl-config --version

cd $VIRTUAL_ENV
pwd

# SO-SIH-159 - 07/25/2018 - Curl 7.51.0
# Installing curl 7.51.0 to keep libcurl link-time and compile-time version same
# Building pycurl against libcurl 7.51.0 resolves the issue
echo "installing curl 7.51.0"
wget https://curl.haxx.se/download/curl-7.51.0.tar.gz
tar -zxvf curl-7.51.0.tar.gz
cd curl-7.51.0
./configure
make
make install
which curl && curl --version
which curl-config && curl-config --version

cd $VIRTUAL_ENV
cd ../../..
pwd
echo "pip install source/image-handler/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install source/image-handler/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/

cd $VIRTUAL_ENV

#installing optipng pngcrush gifsicle pngquant jpegtran
echo "yum install optipng pngcrush gifsicle libjpeg* pngquant ImageMagick-devel -y"
yum install optipng pngcrush gifsicle libjpeg* pngquant ImageMagick-devel -y
mkdir $VIRTUAL_ENV/bin/lib
cp -f /usr/bin/jpegtran $VIRTUAL_ENV
cp -f /usr/bin/optipng $VIRTUAL_ENV
cp -f /usr/bin/pngcrush $VIRTUAL_ENV
cp -f /usr/bin/gifsicle $VIRTUAL_ENV
cp -f /usr/bin/pngquant $VIRTUAL_ENV
cp -f /usr/lib64/libimagequant.so* $VIRTUAL_ENV/bin/lib

#building mozjpeg
cd $VIRTUAL_ENV
pwd
echo 'yum install nasm autoconf automake libtool -y'
yum install nasm autoconf automake libtool -y
echo 'wget https://github.com/mozilla/mozjpeg/releases/download/v3.2/mozjpeg-3.2-release-source.tar.gz'
wget https://github.com/mozilla/mozjpeg/releases/download/v3.2/mozjpeg-3.2-release-source.tar.gz
tar -zxvf mozjpeg-3.2-release-source.tar.gz
cd mozjpeg
autoreconf -fiv
mkdir build && cd build
sh ../configure --disable-shared --enable-static
make install prefix=/var/task libdir=/var/task
cp -f /var/task/libjpeg.so* $VIRTUAL_ENV/bin/lib
# SO-SIH-170 - 08/15/2018 - mozjpeg path
# mozjpeg executable becomes cjpeg, rectifying path
echo "cp -f /var/task/bin/cjpeg $VIRTUAL_ENV"
cp -f /var/task/bin/cjpeg $VIRTUAL_ENV
#building imgmin
cd $VIRTUAL_ENV
pwd
echo 'git clone https://github.com/rflynn/imgmin.git'
git clone https://github.com/rflynn/imgmin.git
cd imgmin
autoreconf -fi
./configure
make
make install
cd $VIRTUAL_ENV
rm -rf imgmin
cp -f "/usr/local/bin/imgmin" $VIRTUAL_ENV
cp -f /usr/lib64/libMagickWand.so* $VIRTUAL_ENV/bin/lib
cp -f /usr/lib64/libMagickCore.so* $VIRTUAL_ENV/bin/lib
cp -f /usr/lib64/libgomp.so* $VIRTUAL_ENV/bin/lib
cp -f /usr/lib64/libtiff.so* $VIRTUAL_ENV/bin/lib
cp -f /usr/lib64/libXt.so* $VIRTUAL_ENV/bin/lib
cp -f /usr/lib64/libltdl.so* $VIRTUAL_ENV/bin/lib
cp -f /usr/lib64/libjbig.so* $VIRTUAL_ENV/bin/lib
#packing all
cd $VIRTUAL_ENV/lib/python2.7/site-packages
pwd
echo "zip -q -r9 $VIRTUAL_ENV/../serverless-image-handler.zip *"
zip -q -r9 $VIRTUAL_ENV/../serverless-image-handler.zip *
cd $VIRTUAL_ENV
pwd
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip pngquant"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip pngquant
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip jpegtran"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip jpegtran
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip optipng"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip optipng
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip pngcrush"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip pngcrush
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip gifsicle"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip gifsicle
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip mozjpeg/cjpeg"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip cjpeg
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip imgmin"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip imgmin
cd $VIRTUAL_ENV/bin
pwd
echo "zip -r -q -g $VIRTUAL_ENV/../serverless-image-handler.zip lib"
zip -r -q -g $VIRTUAL_ENV/../serverless-image-handler.zip lib
cd $VIRTUAL_ENV
pwd
cd ..
zip -q -d serverless-image-handler.zip pip*
zip -q -d serverless-image-handler.zip easy*
echo "Clean up build material"
rm -rf $VIRTUAL_ENV
echo "Completed building distribution"
