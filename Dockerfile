FROM node:10.15.3-alpine

ARG npm_token
ENV nexus_token=$npm_token

RUN apk --no-cache update && \
    apk --no-cache upgrade && \
    apk --no-cache add python git make && \
    apk add --no-cache --virtual .build-dependencies

WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY .npmrc .

RUN npm install && \
    apk del .build-dependencies

USER node

COPY . .

CMD ["npm", "start"]
