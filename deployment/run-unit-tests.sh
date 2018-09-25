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
# ./run-unit-tests.sh

# Test source
echo "Staring to test distribution"
echo "export deployment_dir=`pwd`"
export deployment_dir=`pwd`
echo "mkdir -p test"
mkdir -p test
cd $deployment_dir/test
pwd
# SIM - 07/31/2018 - Fix in class import
# The test.test_support module seems to be missing from 2.7.14.
# Module is needed for unit tests, compiling 2.7.15
# https://docs.python.org/2/library/test.html
wget https://www.python.org/ftp/python/2.7.15/Python-2.7.15.tgz
tar xzf Python-2.7.15.tgz
cd Python-2.7.15
./configure --enable-optimizations
make altinstall
cd ..

echo "virtualenv --python=/usr/local/bin/python2.7 --no-site-packages testenv"
virtualenv --python=/usr/local/bin/python2.7 --no-site-packages testenv
echo "source testenv/bin/activate"
source testenv/bin/activate
pip install pip==9.0.3
cd ../..
pwd

# SO-SIH-157 - 07/17/2018 - Pip version
# Checking python, pip version inside virtualenv
echo "python --version"
python --version
echo "pip --version"
pip --version
echo "virtualenv --version"
virtualenv --version

echo "pip install source/image-handler/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/"
pip install source/image-handler/. --target=$VIRTUAL_ENV/lib/python2.7/site-packages/
echo "pip install mock pytest"
# SIM - 07/31/2018 - Locking dependency version
# Locking to mock==2.0.0 pytest==3.5.0
pip install mock==2.0.0 pytest==3.5.0
echo "pytest source/image-handler"
pytest source/image-handler/
retval=$?
if [ $retval -eq 0 ] ; then
	echo "All tests were successful"
else
	echo "Tests failed"
	exit 1

fi
echo "Clean up test material"
echo "remove virtualenv"
deactivate
rm -rf $VIRTUAL_ENV
rm -rf $deployment_dir/test
pwd
rm -rf source/image-handler/tests/__pycache__
rm -rf source/image-handler/.pytest_cache
rm source/image-handler/tests/*.pyc
echo "Completed testing distribution"
