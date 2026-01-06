import requests
from datetime import datetime

class B3FnetCrawler:
    URL_API = "https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosDados"

    @staticmethod
    def _parse_date(date_str):
        if not date_str:
            return datetime.min
        # B3 usa DD/MM/YYYY HH:mm ou apenas DD/MM/YYYY
        for fmt in ('%d/%m/%Y %H:%M', '%d/%m/%Y'):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return datetime.min

    @staticmethod
    def get_documents_package(cnpj):
        if not cnpj: return None
        clean_cnpj = "".join(filter(str.isdigit, str(cnpj)))
        headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        package = {}

        categorias = {"gerencial": 7, "mensal": 6, "fato_relevante": 1}

        for key, cat_id in categorias.items():
            # l=50: Pegamos uma amostra maior para garantir que o mais novo está no meio
            params = {
                "d": 1, "s": 0, "l": 200, 
                "tipoFundo": 1, 
                "situacao": "A",
                "cnpjFundo": clean_cnpj,
                "idCategoriaDocumento": cat_id,
                "order[0][column]": 5,
                "order[0][dir]": "desc"
            }
            try:
                r = requests.get(B3FnetCrawler.URL_API, params=params, headers=headers, timeout=15)
                if r.status_code == 200:
                    data_list = r.json().get('data', [])
                    if data_list:
                        # 🔥 CRITÉRIO DE DESEMPATE ABSOLUTO:
                        # 1. Ordena pelo ID (o maior ID da B3 é SEMPRE o mais recente no servidor)
                        # 2. Ordena pela dataEntrega (postagem)
                        sorted_list = sorted(
                            data_list, 
                            key=lambda x: (int(x.get('id', 0)), B3FnetCrawler._parse_date(x.get('dataEntrega'))), 
                            reverse=True
                        )
                        
                        doc = sorted_list[0]
                        package[key] = {
                            "link": f"https://fnet.bmfbovespa.com.br/fnet/publico/downloadDocumento?id={doc.get('id')}",
                            "date": str(doc.get('dataEntrega') or ""),    
                            "ref_date": str(doc.get('dataReferencia') or ""), 
                            "type": str(doc.get('tipoDocumento') or doc.get('categoriaDocumento') or "")  
                        }
            except Exception as e:
                print(f"⚠️ Erro em {key} para {clean_cnpj}: {e}")
                continue
        
        return package if package else None