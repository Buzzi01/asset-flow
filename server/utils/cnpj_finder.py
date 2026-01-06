import requests
import re

class CNPJFinder:
    @staticmethod
    def find_by_ticker(ticker):
        ticker = ticker.replace(".SA", "").strip()
        url = f"https://statusinvest.com.br/fii/{ticker.lower()}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            # Busca o padrão de CNPJ no HTML
            match = re.search(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}", response.text)
            if match:
                cnpj_formatado = match.group(0)
                # Retorna apenas os números (14 dígitos)
                return re.sub(r"\D", "", cnpj_formatado)
        except Exception as e:
            print(f"⚠️ Erro ao buscar CNPJ para {ticker}: {e}")
        return None