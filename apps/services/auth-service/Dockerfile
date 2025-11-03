FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/services/auth-service/package.json apps/services/auth-service/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-kernel/package.json packages/shared-kernel/package.json
COPY packages/testing/package.json packages/testing/package.json

RUN npm install --legacy-peer-deps

FROM node:20-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace=@orderly/auth-service

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/services/auth-service/dist ./apps/services/auth-service/dist
COPY apps/services/auth-service/package.json ./apps/services/auth-service/package.json

EXPOSE 3000

CMD ["node", "apps/services/auth-service/dist/main.js"]
