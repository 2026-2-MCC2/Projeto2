# Receita da imagem Docker da API: usada no docker-compose (local) e no deploy do Cloud Run.

# parte de uma imagem oficial com Node 24 já instalado
FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

# instala as dependências primeiro: o Docker reaproveita esta etapa se o package.json não mudar
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# roda sem ser administrador (root), por segurança
USER node
EXPOSE 3300

CMD ["node", "src/server.js"]
