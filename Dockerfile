FROM amazonlinux:2
MAINTAINER Levi Wilson <levi@leviwilson.com>

RUN yum install yum-utils zip -y && \
    yum-config-manager --enable epel && \
    yum update -y && \
    yum install git libpng-devel libcurl-devel gcc python-devel libjpeg-devel -y

RUN yum install python2 python2-pip.noarch python2-setuptools.noarch -y

RUN alias sudo='env PATH=$PATH' && \
    pip install --upgrade setuptools && \
    pip install --upgrade virtualenv
