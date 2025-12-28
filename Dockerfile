# Usa uma imagem Python leve
FROM python:3.11-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para compilar algumas libs
RUN apt-get update && apt-get install -y gcc python3-dev

# Copia o arquivo de requisitos primeiro (para aproveitar cache)
COPY requirements.txt .

# Instala as bibliotecas Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código do backend
COPY . .

# Expõe a porta 5328
EXPOSE 5328

# Comando para iniciar o servidor
CMD ["python", "backend.py"]