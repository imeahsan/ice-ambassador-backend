FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build \
    && npm prune --omit=dev \
    && find node_modules -type f \( -name "*.md" -o -name "*.markdown" -o -name "*.map" -o -name "*.d.ts" \) -delete \
    && find node_modules -type d \( -name "test" -o -name "tests" -o -name "__tests__" -o -name "docs" -o -name "doc" -o -name ".github" \) -prune -exec rm -rf '{}' +

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3701

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/uploads && chown appuser:appgroup /app/uploads

COPY --chown=appuser:appgroup --from=build /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=build /app/dist ./dist
COPY --chown=appuser:appgroup --from=build /app/package.json ./package.json
COPY --chown=appuser:appgroup .env ./.env

USER appuser
EXPOSE 3700
CMD ["node", "dist/main"]

