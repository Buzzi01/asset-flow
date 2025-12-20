import yfinance as yf

print("--- INICIANDO TESTE DE CONEXÃO YAHOO ---")

# 1. Teste Simples (Ação BR)
ticker_br = "PETR4.SA"
print(f"\n1. Tentando baixar {ticker_br}...")
try:
    dados = yf.download(ticker_br, period="5d", progress=False)
    if not dados.empty:
        print(f"✅ Sucesso! Preço atual: {dados['Close'].iloc[-1]:.2f}")
    else:
        print("❌ Baixou, mas veio vazio.")
except Exception as e:
    print(f"❌ Erro ao baixar: {e}")

# 2. Teste ETF/FII (O que deu erro antes)
ticker_fii = "GGRC11.SA"
print(f"\n2. Tentando baixar {ticker_fii}...")
try:
    dados = yf.download(ticker_fii, period="5d", progress=False)
    if not dados.empty:
        print(f"✅ Sucesso! Preço atual: {dados['Close'].iloc[-1]:.2f}")
    else:
        print("❌ Baixou, mas veio vazio.")
except Exception as e:
    print(f"❌ Erro ao baixar: {e}")

print("\n--- FIM DO TESTE ---")