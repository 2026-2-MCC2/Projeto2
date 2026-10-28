FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production


COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src


USER node
EXPOSE 3300

CMD ["node", "src/server.js"]
