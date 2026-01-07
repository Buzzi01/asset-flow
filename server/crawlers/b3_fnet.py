import requests
from datetime import datetime

class B3FnetCrawler:
    URL_API = "https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosDados"

    @staticmethod
    def _parse_date(date_str):
        if not date_str: return datetime.min
        for fmt in ('%d/%m/%Y %H:%M', '%d/%m/%Y'):
            try: return datetime.strptime(date_str, fmt)
            except ValueError: continue
        return datetime.min

    @staticmethod
    def get_documents_package(cnpj):
        """Busca documentos (Gerencial/Mensal) no FNET usando CNPJ"""
        if not cnpj: return None
        clean_cnpj = "".join(filter(str.isdigit, str(cnpj)))
        headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        package = {}
        # Categorias FNET: 7=Gerencial, 6=Mensal, 1=Fato Relevante
        categorias = {"gerencial": 7, "mensal": 6, "fato_relevante": 1}

        for key, cat_id in categorias.items():
            params = {
                "d": 1, "s": 0, "l": 200, "tipoFundo": 1, "situacao": "A",
                "cnpjFundo": clean_cnpj, "idCategoriaDocumento": cat_id,
                "order[0][column]": 5, "order[0][dir]": "desc"
            }
            try:
                r = requests.get(B3FnetCrawler.URL_API, params=params, headers=headers, timeout=15)
                if r.status_code == 200:
                    data_list = r.json().get('data', [])
                    if data_list:
                        # Pega o documento mais recente baseado no ID e Data de Entrega
                        sorted_list = sorted(data_list, key=lambda x: (int(x.get('id', 0)), B3FnetCrawler._parse_date(x.get('dataEntrega'))), reverse=True)
                        doc = sorted_list[0]
                        package[key] = {
                            "link": f"https://fnet.bmfbovespa.com.br/fnet/publico/downloadDocumento?id={doc.get('id')}",
                            "date": str(doc.get('dataEntrega') or ""),    
                            "ref_date": str(doc.get('dataReferencia') or ""), 
                            "type": str(doc.get('tipoDocumento') or doc.get('categoriaDocumento') or "")  
                        }
            except Exception as e:
                print(f"⚠️ Erro FNET ({key}) para {clean_cnpj}: {e}")
        return package if package else None