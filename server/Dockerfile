# server/Dockerfile
FROM python:3.9-slim

# Evita arquivos .pyc e buffer de log
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV IS_DOCKER=true

WORKDIR /app

# Instala dependências do sistema necessárias para compilar algumas libs python
RUN apt-get update && apt-get install -y gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY . .

# Expõe a porta
EXPOSE 5328

# Comando para rodar
CMD ["python", "backend.py"]