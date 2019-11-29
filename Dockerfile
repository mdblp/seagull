FROM node:10.15.3-alpine

ARG npm_token
ENV nexus_token=$npm_token

RUN apk --no-cache update && \
    apk --no-cache upgrade

WORKDIR /app

COPY package.json .
COPY .npmrc .

RUN apk add --no-cache --virtual .build-dependencies git && \
    npm install && \
    apk del .build-dependencies

USER node

COPY . .

CMD ["npm", "start"]
