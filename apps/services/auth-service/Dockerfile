FROM node:20-alpine AS base

ENV NODE_ENV=development
WORKDIR /usr/src/app

RUN apk add --no-cache curl && corepack enable && corepack prepare npm@10.7.0 --activate

COPY package*.json ./
COPY turbo.json tsconfig.base.json ./
COPY apps/services/auth-service/package.json apps/services/auth-service/
COPY apps/services/auth-service/tsconfig.json apps/services/auth-service/
RUN npm install

COPY apps/services/auth-service ./apps/services/auth-service

CMD ["npm", "run", "dev", "--workspace", "@orderly/auth-service"]