import pandas as pd
import requests
import io
import zipfile
import os
from datetime import datetime

class CVMProcessor:
    @staticmethod
    def get_historical_summary(cvm_codes, years_back=3):
        ano_atual = datetime.now().year
        periodos = range(ano_atual, ano_atual - years_back, -1)
        cache_dir = os.path.join(os.getcwd(), 'data', 'cvm_cache')
        os.makedirs(cache_dir, exist_ok=True)
        
        historico_completo = []

        for ano in periodos:
            zip_content = None
            zip_path = os.path.join(cache_dir, f"itr_cia_aberta_{ano}.zip")
            
            if os.path.exists(zip_path):
                with open(zip_path, 'rb') as f: zip_content = f.read()
            else:
                url = f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_{ano}.zip"
                try:
                    r = requests.get(url, timeout=60)
                    if r.status_code == 200:
                        with open(zip_path, 'wb') as f: f.write(r.content)
                        zip_content = r.content
                    else: continue
                except: continue

            try:
                with zipfile.ZipFile(io.BytesIO(zip_content)) as z:
                    filename = f"itr_cia_aberta_DRE_con_{ano}.csv"
                    if filename not in z.namelist(): continue
                    with z.open(filename) as f:
                        df = pd.read_csv(f, sep=';', encoding='latin1')
                
                df.columns = [col.upper() for col in df.columns]
                df['CD_CVM'] = df['CD_CVM'].astype(str).str.zfill(6)
                df = df[df['CD_CVM'].isin(cvm_codes)]
                df = df[df['ST_CONTA_FIXA'] == 'S'] 
                
                col_valor = 'VL_CONTA' if 'VL_CONTA' in df.columns else 'VL_CONT'
                mapeamento = {'3.01': 'receita', '3.05': 'ebit', '3.11': 'lucro_liquido'}

                for code in cvm_codes:
                    emp_df = df[df['CD_CVM'] == code]
                    for dt_refer, grupo in emp_df.groupby('DT_REFER'):
                        mes = datetime.strptime(dt_refer, '%Y-%m-%d').month
                        trimestre = (mes-1)//3 + 1
                        
                        valores = {}
                        for cd_conta, label in mapeamento.items():
                            linha = grupo[grupo['CD_CONTA'] == cd_conta]
                            valores[label] = float(linha.iloc[0][col_valor]) if not linha.empty else 0.0

                        valores['margem_ebit'] = (valores['ebit'] / valores['receita'] * 100) if valores['receita'] > 0 else 0
                        valores['margem_liquida'] = (valores['lucro_liquido'] / valores['receita'] * 100) if valores['receita'] > 0 else 0

                        historico_completo.append({
                            "cvm_code": code,
                            "ano": ano,
                            "trimestre": trimestre,
                            "label": f"{trimestre}T{ano}",
                            "data_base": dt_refer,
                            "valores": valores
                        })
            except Exception as e:
                print(f"Erro no processamento {ano}: {e}")

        if not historico_completo: return []
        df_final = pd.DataFrame(historico_completo).drop_duplicates(subset=['cvm_code', 'label'])
        return df_final.sort_values('data_base').to_dict('records')

    @staticmethod
    def calculate_professional_analysis(data):
        if len(data) < 2: return []
        analise_final = []
        for i in range(len(data)):
            atual = data[i]
            anterior_qoq = data[i-1] if i > 0 else None
            anterior_yoy = next((item for item in data[:i] if item['trimestre'] == atual['trimestre'] and item['ano'] == atual['ano'] - 1), None)

            comparativo = {"periodo": atual['label'], "data_base": atual['data_base'], "dados_brutos": atual['valores'], "analise": {}}

            for metrica in ['receita', 'ebit', 'lucro_liquido']:
                v_atual = atual['valores'][metrica]
                yoy_var = round(((v_atual / anterior_yoy['valores'][metrica]) - 1) * 100, 2) if anterior_yoy and anterior_yoy['valores'][metrica] != 0 else None
                qoq_var = round(((v_atual / anterior_qoq['valores'][metrica]) - 1) * 100, 2) if anterior_qoq and anterior_qoq['valores'][metrica] != 0 else None
                comparativo["analise"][metrica] = {"yoy_crescimento": yoy_var, "qoq_crescimento": qoq_var}
            
            analise_final.append(comparativo)
        return analise_final

    @staticmethod
    def get_dashboard_data(cvm_code):
        hist = CVMProcessor.get_historical_summary([cvm_code], years_back=4)
        analise = CVMProcessor.calculate_professional_analysis(hist)
        if not analise: return None
        recente = analise[-1]
        
        return {
            "ticker_info": { "cvm_code": cvm_code, "ultimo_periodo": recente["periodo"], "data_base": recente["data_base"] },
            "cards_indicadores": [
                { "titulo": "Receita Líquida", "valor": recente["dados_brutos"]["receita"], "yoy": recente["analise"]["receita"]["yoy_crescimento"], "qoq": recente["analise"]["receita"]["qoq_crescimento"], "status": "positivo" if (recente["analise"]["receita"]["yoy_crescimento"] or 0) > 0 else "negativo" },
                { "titulo": "Lucro Líquido", "valor": recente["dados_brutos"]["lucro_liquido"], "yoy": recente["analise"]["lucro_liquido"]["yoy_crescimento"], "qoq": recente["analise"]["lucro_liquido"]["qoq_crescimento"], "status": "positivo" if (recente["analise"]["lucro_liquido"]["yoy_crescimento"] or 0) > 0 else "negativo" },
                { "titulo": "Margem Líquida", "valor_formatado": f"{recente['dados_brutos']['margem_liquida']:.2f}%", "tipo": "eficiencia" }
            ],
            "evolucao_grafico": [ { "label": item["periodo"], "receita": item["dados_brutos"]["receita"], "lucro": item["dados_brutos"]["lucro_liquido"] } for item in analise ]
        }