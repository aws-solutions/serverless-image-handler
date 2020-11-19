#!/bin/bash

set -e

current_dir=$PWD
source_dir=$current_dir/../source

cd $source_dir/constructs
npm install
npm test

cd $source_dir/image-handler
npm test

cd $source_dir/custom-resource
npm test