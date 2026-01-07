import requests
import json
from datetime import datetime

class CVMEnetCrawler:
    URL_LISTA = "https://www.rad.cvm.gov.br/ENET/FrmGerenciarDocumentos.aspx/ListarDocumentos"

    @staticmethod
    def get_documents(cvm_code):
        if not cvm_code: return None
        
        # Headers robustos para evitar bloqueio da CVM
        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://www.rad.cvm.gov.br",
            "Referer": f"https://www.rad.cvm.gov.br/ENET/Consulta/FrmGerenciarDocumentos.aspx?CodigoCVM={cvm_code}"
        }

        # EST_3: ITR, EST_4: DFP, IPE_4: Fato Relevante
        filtros = {
            "balanco": "EST_3,EST_4",
            "fatos": "IPE_4"
        }
        
        package = {}

        for key, cat_id in filtros.items():
            # O payload precisa estar EXATAMENTE nesse formato stringificado dentro de 'data'
            payload = {
                "data": {
                    "idAgrupamento": 0,
                    "tipoConsultar": "C",
                    "codCVM": str(cvm_code),
                    "dataInicio": "01/01/2024",
                    "dataFim": datetime.now().strftime("%d/%m/%Y"),
                    "idCategoriaDocumento": cat_id,
                    "setorSetorial": "0"
                }
            }

            try:
                # Realiza o POST na API oculta da CVM
                r = requests.post(CVMEnetCrawler.URL_API, json=payload, headers=headers, timeout=15)
                
                if r.status_code == 200:
                    # A resposta da CVM vem como uma string JSON dentro de 'd'
                    response_json = r.json()
                    d_data = json.loads(response_json.get('d', '{}'))
                    docs = d_data.get('data', [])
                    
                    if docs:
                        # Ordena para pegar o protocolo mais recente (maior número)
                        doc = sorted(docs, key=lambda x: int(x['Protocolo']), reverse=True)[0]
                        
                        # MONTAGEM DO LINK DE DOWNLOAD (Baseado no seu Payload)
                        link_direto = (
                            f"https://www.rad.cvm.gov.br/ENET/frmDownloadDocumento.aspx?"
                            f"Tela=ext&numSequencia={doc['Sequencia']}&numVersao={doc['Versao']}&"
                            f"numProtocolo={doc['Protocolo']}&descTipo=IPE&CodigoInstituicao=1"
                        )
                        
                        package[key] = {
                            "link": link_direto,
                            "date": doc['DataEntrega'],
                            "ref_date": "ITR/DFP" if key == "balanco" else "Fato Rel.",
                            "type": doc['DescricaoCategoria']
                        }
            except Exception as e:
                print(f"⚠️ Erro CVM Crawler ({key}) para {cvm_code}: {e}")

        # Se conseguimos pelo menos um documento, retornamos o pacote
        return package if package else None