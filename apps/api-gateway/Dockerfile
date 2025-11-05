FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY apps/api-gateway/.env.example apps/api-gateway/.env.example
COPY packages/shared-kernel/package.json packages/shared-kernel/package.json
COPY packages/testing/package.json packages/testing/package.json

RUN npm install --legacy-peer-deps

FROM node:20-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace=@orderly/shared-kernel
RUN npm run build --workspace=@orderly/api-gateway

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api-gateway/dist ./apps/api-gateway/dist
COPY apps/api-gateway/package.json ./apps/api-gateway/package.json
COPY apps/api-gateway/.env.example ./apps/api-gateway/.env.example
COPY packages/shared-kernel ./packages/shared-kernel
COPY packages/testing ./packages/testing

EXPOSE 4000

CMD ["node", "apps/api-gateway/dist/main.js"]
