# Dockerfile (Frontend)
FROM node:18-alpine

WORKDIR /app

# Copia dependências primeiro para aproveitar cache
COPY package.json package-lock.json* ./

RUN npm install

# Copia o resto do código
COPY . .

# Cria o build de produção
RUN npm run build

# Expõe a porta do Next.js
EXPOSE 3000

# Inicia o servidor Next.js
CMD ["npm", "start"]