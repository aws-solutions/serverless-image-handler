FROM public.ecr.aws/serverless/extensions/lambda-insights:12 AS lambda-insights

FROM public.ecr.aws/lambda/nodejs:12
# https://github.com/aws/aws-lambda-base-images/blob/nodejs12.x/Dockerfile.nodejs12.x
COPY --from=lambda-insights /opt /opt
COPY . .
RUN npm install

CMD [ "index.handler" ]