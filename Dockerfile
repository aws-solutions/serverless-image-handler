FROM centos/python-27-centos7

USER root
ENV LD_LIBRARY_PATH=/opt/rh/python27/root/usr/lib64

RUN yum-config-manager --enable epel && \
    yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm -y && \
    yum update -y && \
    yum install git libpng-devel libcurl-devel gcc python-devel libjpeg-devel -y && \
    pip install --upgrade pip==9.0.3 && \
    pip install --upgrade setuptools==39.0.1 && \
    pip install --upgrade virtualenv==15.2.0 && \
    yum install optipng pngcrush gifsicle libjpeg* pngquant ImageMagick-devel  \
                nasm autoconf automake libtool -y

VOLUME /app

WORKDIR /app/deployment
