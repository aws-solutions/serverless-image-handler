#! /bin/bash
set -e

# install prerequisites
yum install -y gcc-c++ make which zip
curl -sL https://rpm.nodesource.com/setup_8.x | bash -
yum install -y nodejs

cd deployment

# tests
./run-unit-tests.sh

# build output package
./build-s3-dist.sh $@
