FROM amazonlinux:2017.03.1.20170812

# lock yum to the same repository version
RUN sed -i 's/releasever=.*/releasever=2017.03/g' /etc/yum.conf

# base requirements
RUN yum install yum-utils zip -y && \
    yum-config-manager --enable epel && \
    yum install wget git libpng-devel libcurl-devel gcc python27-devel libjpeg-devel -y

# enable epel on Amazon Linux 2
RUN yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm

# ImageMagick
RUN yum install -y ImageMagick-devel

# Other libraries
RUN yum install -y pngcrush libjpeg* gifsicle

# optipng
RUN wget http://dl.fedoraproject.org/pub/epel/6/x86_64/Packages/o/optipng-0.7.6-6.el6.x86_64.rpm && \
    yum localinstall optipng-0.7.6-6.el6.x86_64.rpm -y && rm optipng*rpm

# pngquant
RUN wget http://dl.fedoraproject.org/pub/epel/6/x86_64/Packages/l/libimagequant-2.5.2-5.el6.x86_64.rpm && \
    yum localinstall libimagequant-2.5.2-5.el6.x86_64.rpm -y && rm libimagequant*rpm && \
    wget http://dl.fedoraproject.org/pub/epel/6/x86_64/Packages/p/pngquant-2.5.2-5.el6.x86_64.rpm && \
    yum localinstall pngquant-2.5.2-5.el6.x86_64.rpm -y && rm pngquant*rpm

# pip
RUN alias sudo='env PATH=$PATH' && \
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python get-pip.py && rm get-pip.py && \
    pip install --upgrade setuptools && \
    pip install --upgrade virtualenv

# pycurl
RUN yum install -y nss-devel
ENV PYCURL_SSL_LIBRARY=nss

RUN mkdir /lambda
VOLUME /lambda
WORKDIR /lambda/deployment

ENTRYPOINT ["./build-s3-dist.sh"]
CMD ["source-bucket-base-name"]
