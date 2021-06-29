FROM node:14-slim as builder

RUN mkdir /app && \
    chown node /app

USER node

WORKDIR /app

COPY --chown=node:node package.json yarn.lock /app/

RUN yarn

COPY --chown=node:node . .

RUN yarn build


FROM node:14-slim

RUN mkdir /app && \
    chown node /app

USER node

WORKDIR /app

COPY --chown=node:node package.json yarn.lock /app/

ENV NODE_ENV=production

# https://pm2.keymetrics.io/docs/usage/docker-pm2-nodejs/
RUN yarn --production \
    && yarn add --dev pm2 \
    && yarn cache clean --all

COPY --from=builder /app/lib /app/lib

EXPOSE 8080

CMD ["node_modules/.bin/pm2-runtime", "/app/lib/index.js"]
