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

# Build source
echo "Staring to build distribution"
echo "export deployment_dir=`pwd`"
export deployment_dir=`pwd`
echo "mkdir -p dist"
mkdir -p dist
echo "cp -f serverless-image-handler.template dist"
cp -f serverless-image-handler.template dist
echo "Creating UI ZIP file"
cd $deployment_dir/../source/ui
zip -q -r9 $deployment_dir/dist/serverless-image-handler-ui.zip *
echo "Building custom resource package ZIP file"
cd $deployment_dir/dist
pwd
echo "virtualenv env"
virtualenv env
echo "source env/bin/activate"
source env/bin/activate
echo "pip install $deployment_dir/../source/image-handler-custom-resource/. --target=$deployment_dir/dist/env/lib/python2.7/site-packages/"
pip install $deployment_dir/../source/image-handler-custom-resource/. --target=$deployment_dir/dist/env/lib/python2.7/site-packages/
cd $deployment_dir/dist/env/lib/python2.7/site-packages/
zip -r9 $deployment_dir/dist/serverless-image-handler-custom-resource.zip *
cd $deployment_dir/dist
zip -q -d serverless-image-handler-custom-resource.zip pip*
zip -q -d serverless-image-handler-custom-resource.zip easy*
rm -rf env
echo "Building Image Handler package ZIP file"
cd $deployment_dir/dist
pwd
echo "virtualenv env"
virtualenv env
echo "source env/bin/activate"
source env/bin/activate
cd ../..
pwd
echo "pip install source/image-handler/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install source/image-handler/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/
echo "pip install -r source/image-handler/requirements.txt --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install -r source/image-handler/requirements.txt --target=$VIRTUAL_ENV/lib/python2.7/site-packages/
cd $VIRTUAL_ENV
pwd
#building pngquant
echo "cp pngquant $VIRTUAL_ENV"
cp -f pngquant $VIRTUAL_ENV
#installing optipng pngcrush gifsicle jpegtran
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
sh ../configure
make install prefix=/var/task libdir=/var/task
cp -f /var/task/libjpeg.so* $VIRTUAL_ENV/bin/lib
cp -f /var/task/bin/jpegtran $VIRTUAL_ENV/mozjpeg
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
echo "zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip mozjpeg"
zip -q -g $VIRTUAL_ENV/../serverless-image-handler.zip mozjpeg
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
