FROM node:20-alpine AS base

ENV NODE_ENV=development
WORKDIR /usr/src/app

RUN apk add --no-cache curl && corepack enable && corepack prepare npm@10.7.0 --activate

COPY package*.json ./
COPY turbo.json tsconfig.base.json ./
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/api-gateway/tsconfig.json apps/api-gateway/
COPY packages/shared-kernel/package.json packages/shared-kernel/
RUN npm install

COPY apps/api-gateway ./apps/api-gateway
COPY packages/shared-kernel ./packages/shared-kernel

CMD ["npm", "run", "dev", "--workspace", "@orderly/api-gateway"]