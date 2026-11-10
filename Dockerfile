FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
COPY --from=build /app/package*.json ./
# tsx is the small TypeScript launcher used by the API server.
RUN npm ci --omit=dev && npm install --no-save tsx@4
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/content ./src/content
COPY --from=build /app/src/types.ts ./src/types.ts
EXPOSE 8080
CMD ["node","--import","tsx","server/index.ts"]
