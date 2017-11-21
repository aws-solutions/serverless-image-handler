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
    printf "Please provide the base source bucket name where the lambda code will eventually reside."
    printf "For example: ./build-s3-dist.sh solutions"
    exit 1
fi

# Build source
printf "Starting to build distribution"
script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
src_dir="$script_dir/../source"
dist_dir="$script_dir/dist"
env_dir="$script_dir/env"

mkdir -p "$dist_dir"

printf "Updating code source bucket in template with %s" "$1"
replace="s/%%BUCKET_NAME%%/$1/g"
sed -e "$replace" < "$script_dir/serverless-image-handler.template" > "$dist_dir/serverless-image-handler.template"

printf "Creating UI ZIP file"
(
  cd "$src_dir/ui"
  zip -q -r9 "$dist_dir/serverless-image-handler-ui.zip" ./*
)

printf "Building custom resource package ZIP file"
virtualenv "$env_dir"
VIRTUAL_ENV_DISABLE_PROMPT=true source "$env_dir/bin/activate"
pkg_dir="$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install "$src_dir/image-handler-custom-resource/." --target="$pkg_dir"

(
  cd "$pkg_dir/"
  zip -r9 "$dist_dir/serverless-image-handler-custom-resource.zip" ./*
)

zip -q -d "$dist_dir/serverless-image-handler-custom-resource.zip" pip*
zip -q -d "$dist_dir/serverless-image-handler-custom-resource.zip" easy*

rm -rf "$VIRTUAL_ENV"

printf "Building Image Handler package ZIP file"
virtualenv "$env_dir"
VIRTUAL_ENV_DISABLE_PROMPT=true source "$env_dir/bin/activate"
pkg_dir="$VIRTUAL_ENV/lib/python2.7/site-packages/"

pip install "$src_dir/image-handler/." --target="$pkg_dir"
pip install -r "$src_dir/image-handler/requirements.txt" --target="$pkg_dir"

(
  cd "$pkg_dir"
  zip -q -r9 "$dist_dir/serverless-image-handler.zip" ./*
)

(
  # build/install libpng
  static_lib="$dist_dir/static_lib"
  cd "$dist_dir"
  rm -rf libpng-1.6.34 libpng-1.6.34.tar.gz
  curl -JLO https://download.sourceforge.net/libpng/libpng-1.6.34.tar.gz
  tar zxvf libpng-1.6.34.tar.gz
  cd libpng-1.6.34
  ./configure --prefix="$static_lib"
  make
  make install
  rm -rf "$dist_dir/libpng-1.6.34" "$dist_dir/libpng-1.6.34.tar.gz"

  # build pngquant with static libpng
  cd "$dist_dir"
  rm -rf pngquant_s
  git clone https://github.com/pornel/pngquant.git pngquant_s
  (
    cd pngquant_s
    ./configure --with-libpng="$static_lib"
    make
    zip -q -g "$dist_dir/serverless-image-handler.zip" pngquant
  )
  rm -rf pngquant_s
  rm -rf "$static_lib"
)

zip -q -d "$dist_dir/serverless-image-handler.zip" pip*
zip -q -d "$dist_dir/serverless-image-handler.zip" easy*

printf "Clean up build material"
rm -rf "$VIRTUAL_ENV"
printf "Completed building distribution"
