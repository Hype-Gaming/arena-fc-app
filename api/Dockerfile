# api/Dockerfile
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY api/package.json ./
RUN npm install
COPY api/ ./
RUN npx prisma generate && npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
# Apply migrations, then seed (idempotent upserts — Free/Premium plans and
# achievements MUST exist or plan webhooks fail with "Plan not found"), then boot.
# `prisma db seed` runs ts-node prisma/seed.ts, so tsconfig.json + dev deps
# (ts-node) copied above are required.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
