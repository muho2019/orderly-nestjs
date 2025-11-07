# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

ENV NODE_ENV=development
WORKDIR /usr/src/app

RUN apk add --no-cache curl
RUN corepack enable && corepack prepare npm@10.7.0 --activate

# Install workspace deps
COPY package*.json ./
COPY turbo.json tsconfig.base.json ./
COPY apps/services/payments-service/package.json apps/services/payments-service/
COPY apps/services/payments-service/tsconfig.json apps/services/payments-service/
COPY packages/shared-kernel/package.json packages/shared-kernel/
RUN npm install

# Copy rest of repo
COPY . .

CMD ["npm", "run", "dev", "--workspace", "@orderly/payments-service"]
