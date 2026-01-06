import requests

class NameFinder:
    # Dicionário de segurança para garantir que seus ativos principais nunca falhem
    FIXED_NAMES = {
        "HGLG11": "CSHG LOGISTICA - FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "MXRF11": "MAXI RENDA FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "BTLG11": "BTG PACTUAL LOGÍSTICA FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "XPML11": "XP MALLS FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "HGBS11": "HEDGE BRASIL SHOPPING FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "RZAG11": "RIZA AKRO FIAGRO IMOBILIÁRIO",
        "HGRU11": "CSHG RENDA URBANA - FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "VGIA11": "VALORA REGE FIAGRO IMOBILIÁRIO",
        "GGRC11": "GGR COVEPI RENDA FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "TRXF11": "TRX REAL ESTATE FUNDO DE INVESTIMENTO IMOBILIÁRIO",
        "VGHF11": "VALORA HEDGE FUNDO DE INVESTIMENTO IMOBILIÁRIO"
    }

    @staticmethod
    def get_formal_name(ticker):
        t = ticker.replace(".SA", "").strip().upper()
        
        # 1. Tenta no dicionário fixo primeiro
        if t in NameFinder.FIXED_NAMES:
            print(f"   🎯 Nome recuperado do dicionário: {t}", flush=True)
            return NameFinder.FIXED_NAMES[t]

        # 2. Se não estiver no dicionário, tenta a API (Fallback)
        url = f"https://statusinvest.com.br/home/mainsearchquery?q={t}"
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            response = requests.get(url, headers=headers, timeout=5)
            data = response.json()
            if data and len(data) > 0:
                return data[0].get('name')
        except:
            pass
        return t # Retorna o próprio ticker se tudo falhar