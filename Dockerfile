FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

# No port is exposed and no HTTP endpoint exists, so there is no healthcheck; Docker restarts the container if the process exits
CMD ["node", "src/index.js"]
