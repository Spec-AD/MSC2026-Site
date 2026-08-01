FROM node:20-alpine AS client-build
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
ENV PORT=5000
ENV CLIENT_DIST_DIR=/app/client-dist
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /build/client/dist /app/client-dist
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -q -O - http://127.0.0.1:5000/api/health || exit 1
CMD ["npm", "start"]
