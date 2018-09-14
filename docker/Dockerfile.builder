FROM amazonlinux:2.20180827
ENV source-bucket-base-name="/stuff"

mkdir -p /build/deployment

RUN yum update -y && \
        yum install yum-utils && \
        yum-config-manager --enable epel && \
        yum update -y && \
        yum install git libpng-devel libcurl-devel gcc python-devel \
            libjpeg-devel python-pip -y && \
        pip install --upgrade pip && \
        pip install --upgrade setuptools && \
        pip install --upgrade virtualenv

WORKDIR /build/deployment

CMD ./build-s3-dist.sh $source-bucket-base-name

        

