FROM node:20-alpine AS base

ENV NODE_ENV=development
WORKDIR /usr/src/app

RUN apk add --no-cache curl && corepack enable && corepack prepare npm@10.7.0 --activate

COPY package*.json ./
COPY turbo.json tsconfig.base.json ./
COPY apps/services/orders-service/package.json apps/services/orders-service/
COPY apps/services/orders-service/tsconfig.json apps/services/orders-service/
COPY packages/shared-kernel/package.json packages/shared-kernel/
RUN npm install

COPY apps/services/orders-service ./apps/services/orders-service
COPY packages/shared-kernel ./packages/shared-kernel

CMD ["npm", "run", "dev", "--workspace", "@orderly/orders-service"]