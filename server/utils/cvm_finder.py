import pandas as pd
import requests
import io

class CVMFinder:
    @staticmethod
    def find_code(cnpj_limpo):
        if not cnpj_limpo or len(cnpj_limpo) != 14:
            return None

        url_csv = "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv"
        try:
            response = requests.get(url_csv, timeout=20)
            if response.status_code == 200:
                # O CSV da CVM é Latin-1 e separado por ';'
                df = pd.read_csv(io.StringIO(response.text), sep=';', encoding='latin1')
                df['CNPJ_CIA'] = df['CNPJ_CIA'].str.replace(r'\D', '', regex=True)
                
                resultado = df[df['CNPJ_CIA'] == cnpj_limpo]
                if not resultado.empty:
                    # Retorna o código com 6 dígitos (ex: 001279)
                    return str(resultado.iloc[0]['CD_CVM']).zfill(6)
        except Exception as e:
            print(f"⚠️ Erve ao filtrar CSV da CVM: {e}")
        return None