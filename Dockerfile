FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/.local/documents && chown -R node:node /app/.local
USER node
EXPOSE 3000
CMD ["npm", "start"]
