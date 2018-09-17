FROM amazonlinux:2.0.20180827

ENV BUCKET_BASE_NAME="stuff"

COPY docker-entrypoint.sh /

RUN chmod +x /docker-entrypoint.sh && \
    mkdir -p /build/deployment

RUN yum update -y && \
    yum install -y yum-utils && \
    yum-config-manager --enable epel && \
    yum update -y && \
    yum install git libpng-devel libcurl-devel gcc python-devel \
        libjpeg-devel python-pip zip make -y && \
    pip install --upgrade pip && \
    pip install --upgrade setuptools && \
    pip install --upgrade virtualenv

WORKDIR /build/deployment

CMD /docker-entrypoint.sh

        

