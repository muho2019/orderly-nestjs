# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

ENV NODE_ENV=development
WORKDIR /usr/src/app

RUN apk add --no-cache curl
RUN corepack enable && corepack prepare npm@10.7.0 --activate

COPY package*.json ./
COPY turbo.json tsconfig.base.json ./
COPY apps/services/catalog-service/package.json apps/services/catalog-service/
COPY apps/services/catalog-service/tsconfig.json apps/services/catalog-service/
COPY packages/shared-kernel/package.json packages/shared-kernel/
RUN npm install

COPY . .

CMD ["npm", "run", "dev", "--workspace", "@orderly/catalog-service"]
