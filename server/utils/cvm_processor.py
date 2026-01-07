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
            zip_path = os.path.join(cache_dir, f"itr_cia_aberta_{ano}.zip")
            if not os.path.exists(zip_path):
                url = f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_{ano}.zip"
                try:
                    r = requests.get(url, timeout=30)
                    if r.status_code == 200:
                        with open(zip_path, 'wb') as f: f.write(r.content)
                    else: continue
                except: continue

            try:
                with open(zip_path, 'rb') as f_zip:
                    with zipfile.ZipFile(io.BytesIO(f_zip.read())) as z:
                        list_files = z.namelist()
                        
                        arquivos_alvo = {
                            'DRE': f"itr_cia_aberta_DRE_con_{ano}.csv",
                            'BPA': f"itr_cia_aberta_BPA_con_{ano}.csv",
                            'BPP': f"itr_cia_aberta_BPP_con_{ano}.csv",
                            'DFC': f"itr_cia_aberta_DFC_MI_con_{ano}.csv" if f"itr_cia_aberta_DFC_MI_con_{ano}.csv" in list_files else f"itr_cia_aberta_DFC_MD_con_{ano}.csv"
                        }

                        consolidado_per_date = {}

                        for tipo, filename in arquivos_alvo.items():
                            if filename not in list_files: continue
                            with z.open(filename) as f:
                                df = pd.read_csv(f, sep=';', encoding='latin1', low_memory=False)
                                df.columns = [col.upper() for col in df.columns]
                                df['CD_CVM'] = df['CD_CVM'].astype(str).str.zfill(6)
                                df = df[df['CD_CVM'].isin(cvm_codes)]
                                
                                contas_map = {
                                    '1': 'ativo_total', '3.01': 'receita', '3.05': 'lucro_bruto',
                                    '3.07': 'ebit', '3.06': 'resultado_financeiro', '3.11': 'lucro_liquido',
                                    '1.01.01': 'caixa', '2.03': 'patrimonio_liquido',
                                    '2.01.04': 'divida_cp', '2.02.01': 'divida_lp',
                                    '6.01': 'fco', '6.02': 'capex', '6.01.01.04': 'depreciacao'
                                }

                                for code in cvm_codes:
                                    emp_df = df[df['CD_CVM'] == code]
                                    for dt_refer, grupo in emp_df.groupby('DT_REFER'):
                                        chave = f"{code}_{dt_refer}"
                                        if chave not in consolidado_per_date:
                                            mes = datetime.strptime(dt_refer, '%Y-%m-%d').month
                                            tri = (mes-1)//3 + 1
                                            consolidado_per_date[chave] = {
                                                "cvm_code": code, "ano": ano, "trimestre": tri,
                                                "label": f"{tri}T{ano}", "data_base": dt_refer, "valores": {}
                                            }
                                        
                                        for cd_cvm_conta, label in contas_map.items():
                                            linha = grupo[grupo['CD_CONTA'] == cd_cvm_conta]
                                            if not linha.empty:
                                                val = float(linha.iloc[0]['VL_CONTA'] if 'VL_CONTA' in linha.columns else linha.iloc[0]['VL_CONT'])
                                                consolidado_per_date[chave]["valores"][label] = consolidado_per_date[chave]["valores"].get(label, 0.0) + val

                        for data in consolidado_per_date.values():
                            v = data["valores"]
                            for k in contas_map.values():
                                if k not in v: v[k] = 0.0
                            
                            v['divida_bruta'] = v['divida_cp'] + v['divida_lp']
                            v['divida_liquida'] = v['divida_bruta'] - v['caixa']
                            v['ebitda'] = v['ebit'] + abs(v['depreciacao'])
                            v['margem_ebitda'] = (v['ebitda'] / v['receita'] * 100) if v['receita'] > 0 else 0
                            v['margem_liquida'] = (v['lucro_liquido'] / v['receita'] * 100) if v['receita'] > 0 else 0
                            v['margem_bruta'] = (v['lucro_bruto'] / v['receita'] * 100) if v['receita'] > 0 else 0
                            v['roe'] = (v['lucro_liquido'] / v['patrimonio_liquido'] * 100) if v['patrimonio_liquido'] > 0 else 0
                            v['roa'] = (v['lucro_liquido'] / v['ativo_total'] * 100) if v['ativo_total'] > 0 else 0
                            v['giro_ativo'] = (v['receita'] / v['ativo_total']) if v['ativo_total'] > 0 else 0
                            v['fcl'] = v['fco'] + v['capex'] 
                            
                            historico_completo.append(data)

            except Exception as e:
                print(f"Erro no processamento {ano}: {e}")

        if not historico_completo: return []
        df_final = pd.DataFrame(historico_completo).drop_duplicates(subset=['cvm_code', 'label'])
        return df_final.sort_values('data_base').to_dict('records')

    @staticmethod
    def calculate_professional_analysis(data):
        if len(data) < 1: return []
        analise_final = []
        for i in range(len(data)):
            atual = data[i]
            anterior_qoq = data[i-1] if i > 0 else None
            anterior_yoy = next((item for item in data[:i] if item['trimestre'] == atual['trimestre'] and item['ano'] == atual['ano'] - 1), None)

            comparativo = {"periodo": atual['label'], "data_base": atual['data_base'], "dados_brutos": atual['valores'], "analise": {}}

            for metrica in ['receita', 'ebit', 'lucro_liquido', 'fco', 'fcl']:
                v_atual = atual['valores'].get(metrica, 0)
                v_ant_yoy = anterior_yoy['valores'].get(metrica, 0) if anterior_yoy else 0
                v_ant_qoq = anterior_qoq['valores'].get(metrica, 0) if anterior_qoq else 0
                
                yoy_var = round(((v_atual / v_ant_yoy) - 1) * 100, 2) if v_ant_yoy != 0 else 0
                qoq_var = round(((v_atual / v_ant_qoq) - 1) * 100, 2) if v_ant_qoq != 0 else 0
                comparativo["analise"][metrica] = {"yoy_crescimento": yoy_var, "qoq_crescimento": qoq_var}
            
            analise_final.append(comparativo)
        return analise_final

    @staticmethod
    def get_dashboard_data(cvm_code):
        hist = CVMProcessor.get_historical_summary([cvm_code], years_back=3)
        analise = CVMProcessor.calculate_professional_analysis(hist)
        if not analise: return None
        recente = analise[-1]
        v_brutos = recente["dados_brutos"]
        
        ebitda_calc = v_brutos.get('ebitda', v_brutos['ebit'])
        alavancagem = v_brutos['divida_liquida'] / ebitda_calc if ebitda_calc > 0 else 0

        return {
            "ticker_info": { "cvm_code": cvm_code, "ultimo_periodo": recente["periodo"], "data_base": recente["data_base"] },
            "cards_indicadores": [
                # CAMADA 1 e 2: Eficiência
                { 
                    "titulo": "Receita Líquida", 
                    "valor": v_brutos["receita"], 
                    "yoy": recente["analise"]["receita"]["yoy_crescimento"], 
                    "qoq": recente["analise"]["receita"]["qoq_crescimento"], # ADICIONADO QoQ
                    "tipo": "eficiencia" 
                },
                { "titulo": "Margem Bruta", "valor_formatado": f"{v_brutos['margem_bruta']:.1f}%", "tipo": "eficiencia" },
                { "titulo": "EBITDA", "valor": v_brutos["ebitda"], "subtitulo": f"Margem: {v_brutos['margem_ebitda']:.1f}%", "tipo": "eficiencia" },
                { 
                    "titulo": "Lucro Líquido", 
                    "valor": v_brutos["lucro_liquido"], 
                    "yoy": recente["analise"]["lucro_liquido"]["yoy_crescimento"], 
                    "qoq": recente["analise"]["lucro_liquido"]["qoq_crescimento"], # ADICIONADO QoQ
                    "tipo": "eficiencia" 
                },
                
                # CAMADA 3: Risco
                { "titulo": "Dívida Líquida", "valor": v_brutos["divida_liquida"], "tipo": "risco", "subtitulo": f"{alavancagem:.2f}x EBITDA" },
                { "titulo": "Resultado Financeiro", "valor": v_brutos["resultado_financeiro"], "tipo": "risco", "status": "negativo" if v_brutos["resultado_financeiro"] < 0 else "positivo" },

                # CAMADA 4: Rentabilidade
                { "titulo": "ROE", "valor_formatado": f"{v_brutos['roe']:.2f}%", "tipo": "rentabilidade" },
                { "titulo": "ROA", "valor_formatado": f"{v_brutos['roa']:.2f}%", "tipo": "rentabilidade", "subtitulo": f"Giro: {v_brutos['giro_ativo']:.2f}x" },

                # CAMADA 5: Caixa
                { 
                    "titulo": "Fluxo Operacional (FCO)", 
                    "valor": v_brutos["fco"], 
                    "yoy": recente["analise"]["fco"]["yoy_crescimento"], 
                    "qoq": recente["analise"]["fco"]["qoq_crescimento"], # ADICIONADO QoQ
                    "tipo": "caixa" 
                },
                { "titulo": "Fluxo Caixa Livre (FCL)", "valor": v_brutos["fcl"], "tipo": "caixa", "subtitulo": f"Capex: {v_brutos['capex']:,.0f}" }
            ],
            "evolucao_grafico": [ { 
                "label": item["periodo"], 
                "receita": item["dados_brutos"]["receita"], 
                "lucro": item["dados_brutos"]["lucro_liquido"], 
                "fco": item["dados_brutos"]["fco"],
                "fcl": item["dados_brutos"]["fcl"] 
            } for item in analise ]
        }
