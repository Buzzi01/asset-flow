import requests
import pandas as pd
import io
import re

def find_cvm_code_via_dados_abertos(ticker):
    ticker = ticker.upper().replace(".SA", "").strip()
    
    # --- ETAPA 1: BUSCAR CNPJ (Sua lógica existente) ---
    cnpj_limpo = None
    try:
        url_si = f"https://statusinvest.com.br/acoes/{ticker.lower()}"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url_si, headers=headers, timeout=10)
        match = re.search(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}", response.text)
        if match:
            # Mantém apenas os números do CNPJ para comparar com o CSV
            cnpj_limpo = re.sub(r"\D", "", match.group(0))
    except Exception as e:
        print(f"   ⚠️ Erro CNPJ: {e}")

    if not cnpj_limpo:
        return None

    # --- ETAPA 2: CONSULTAR CSV DA CVM ---
    url_csv = "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv"
    try:
        # Baixa o CSV (usando separador ';' e encoding latin1 que é o padrão da CVM)
        response = requests.get(url_csv, timeout=20)
        if response.status_code == 200:
            # Lê o CSV diretamente da memória
            df = pd.read_csv(io.StringIO(response.text), sep=';', encoding='latin1')
            
            # Limpa o CNPJ da coluna da CVM para garantir a comparação correta
            df['CNPJ_CIA'] = df['CNPJ_CIA'].str.replace(r'\D', '', regex=True)
            
            # Busca a linha correspondente ao CNPJ
            filtro = df[df['CNPJ_CIA'] == cnpj_limpo]
            
            if not filtro.empty:
                # O campo 'CD_CVM' é o código que precisamos
                codigo_cvm = str(filtro.iloc[0]['CD_CVM']).zfill(6)
                return codigo_cvm
    except Exception as e:
        print(f"   ⚠️ Erro ao processar CSV da CVM: {e}")

    return None

# --- TESTE ---
if __name__ == "__main__":
    acoes = ["PETR4", "VALE3", "ITUB4", "SAPR11", "BBSE3"]
    for t in acoes:
        code = find_cvm_code_via_dados_abertos(t)
        print(f"Ticker: {t} | Código CVM: {code}")