# Build context is the repository root (see docker-compose.yml).
FROM node:20-alpine AS build
WORKDIR /app/database/backend
COPY database/backend/package*.json ./
# Skip the postinstall build: sources are copied and compiled in the next steps.
RUN npm ci --ignore-scripts
COPY database/backend/. .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app/database/backend
ENV NODE_ENV=production
COPY database/backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/database/backend/dist ./dist
COPY database/migrations /app/database/migrations
EXPOSE 4000
CMD ["node", "dist/index.js"]
