FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/.env apps/web/.env
COPY apps/services/auth-service/package.json apps/services/auth-service/package.json
COPY packages/shared-kernel/package.json packages/shared-kernel/package.json
COPY packages/testing/package.json packages/testing/package.json

RUN npm install --legacy-peer-deps

FROM node:20-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace=@orderly/web

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY package.json package-lock.json ./
COPY apps/web/.env ./apps/web/.env

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@orderly/web"]
