FROM amazonlinux:2017.03.1.20170812
MAINTAINER Levi Wilson <levi@leviwilson.com>

RUN yum install yum-utils zip -y && \
    yum-config-manager --enable epel && \
    yum update -y && \
    yum install git libpng-devel libcurl-devel gcc python-devel libjpeg-devel -y

RUN yum install python27 python27-setuptools.noarch -y

RUN alias sudo='env PATH=$PATH' && \
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python get-pip.py && rm get-pip.py && \
    pip install --upgrade setuptools && \
    pip install --upgrade virtualenv

# pycurl
RUN yum install -y gcc-c++ make python27-devel openssl-devel

ENV PYCURL_SSL_LIBRARY=openssl
