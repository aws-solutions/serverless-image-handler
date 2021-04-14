FROM public.ecr.aws/lambda/nodejs:12

# install CloudWatch Lambda Insights extension, see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-Getting-Started-docker.html
RUN curl -O https://lambda-insights-extension.s3-ap-northeast-1.amazonaws.com/amazon_linux/lambda-insights-extension.rpm && \
    rpm -U lambda-insights-extension.rpm && \
    rm -f lambda-insights-extension.rpm

# https://github.com/aws/aws-lambda-base-images/blob/nodejs12.x/Dockerfile.nodejs12.x
COPY . .
RUN npm install

CMD [ "index.handler" ]