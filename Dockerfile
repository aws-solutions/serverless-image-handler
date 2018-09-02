FROM amazonlinux:2017.03.1.20170812
MAINTAINER Levi Wilson <levi@leviwilson.com>

# lock yum to the same repository version
RUN sed -i 's/releasever=.*/releasever=2017.03/g' /etc/yum.conf

# base requirements
RUN yum install yum-utils zip -y && \
    yum-config-manager --enable epel && \
    yum install git libpng-devel libcurl-devel gcc python27-devel libjpeg-devel -y

# pip
RUN alias sudo='env PATH=$PATH' && \
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python get-pip.py && rm get-pip.py && \
    pip install --upgrade setuptools && \
    pip install --upgrade virtualenv

# pycurl
RUN yum install -y openssl-devel
ENV PYCURL_SSL_LIBRARY=openssl
