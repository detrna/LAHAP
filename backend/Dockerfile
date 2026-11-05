FROM node:26.13-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:26.13-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/src/infrastructure/database/prisma ./src/infrastructure/database/prisma
RUN mkdir -p log && chown node:node log
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
