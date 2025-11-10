FROM node:20-alpine AS dev

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/.env apps/web/.env
COPY packages/shared-kernel/package.json packages/shared-kernel/package.json

RUN npm install --legacy-peer-deps

COPY apps/web ./apps/web
COPY packages/shared-kernel ./packages/shared-kernel

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace=@orderly/web", "--", "-H", "0.0.0.0"]
