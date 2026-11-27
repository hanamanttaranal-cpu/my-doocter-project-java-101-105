# Build Stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Run Stage
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/backend ./backend
COPY --from=build /app/gateway ./gateway
COPY --from=build /app/database ./database
COPY --from=build /app/k8s ./k8s
COPY --from=build /app/docker-compose.yml ./docker-compose.yml
COPY --from=build /app/Jenkinsfile ./Jenkinsfile

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["npm", "start"]
