from flask import Blueprint, jsonify
from sqlalchemy.orm import Session
from database.models import Asset, Position, engine
import yfinance as yf
from datetime import datetime
import pytz
import sys

calendar_bp = Blueprint('calendar', __name__)

@calendar_bp.route('/api/calendar', methods=['GET'])
def get_calendar():
    # flush=True garante que apareça no log do Docker imediatamente
    print("\n🔍 --- INICIANDO BUSCA DE PROVENTOS ---", flush=True)
    session = Session(bind=engine)
    events = []
    
    try:
        # Busca ativos com quantidade
        positions = session.query(Position).join(Asset).filter(Position.quantity > 0).all()
        print(f"📦 Ativos na carteira: {len(positions)}", flush=True)

        tz = pytz.timezone("America/Sao_Paulo")
        today = datetime.now(tz).date()

        for pos in positions:
            ticker_raw = pos.asset.ticker.strip().upper()
            
            # Pula ativos genéricos
            if any(x in ticker_raw for x in ["CAIXINHA", "BTC", "ETH"]):
                continue

            try:
                # Lógica de Sufixo Inteligente
                # Ativos americanos (VT, AIQ, VNQ) geralmente têm 2 a 4 letras. 
                # Ativos brasileiros (PETR4, HGLG11) têm 5 ou mais.
                if len(ticker_raw) >= 5 and not ticker_raw.endswith('.SA'):
                    ticker_yahoo = f"{ticker_raw}.SA"
                else:
                    ticker_yahoo = ticker_raw
                
                print(f"📡 Consultando: {ticker_yahoo}", flush=True)
                stock = yf.Ticker(ticker_yahoo)
                
                # 1. Tabela de Dividendos
                divs = stock.dividends
                if not divs.empty:
                    if divs.index.tz is None: divs.index = divs.index.tz_localize(tz)
                    else: divs.index = divs.index.tz_convert(tz)

                    future_divs = divs[divs.index.date >= today]
                    for date_com, value in future_divs.items():
                        print(f"   ✅ {ticker_raw}: R$ {value} confirmado", flush=True)
                        events.append({
                            "ticker": ticker_raw,
                            "date": date_com.strftime('%Y-%m-%d'),
                            "total": float(value) * float(pos.quantity),
                            "value_per_share": float(value),
                            "status": "Confirmado",
                            "is_estimate": False
                        })

                # 2. Info/Resumo (Somente se não achou no histórico)
                if not any(e['ticker'] == ticker_raw for e in events):
                    info = stock.info
                    ex_ts = info.get('exDividendDate')
                    if ex_ts:
                        ex_date = datetime.fromtimestamp(ex_ts, tz).date()
                        if ex_date >= today:
                            val = info.get('dividendRate') or (divs.iloc[-1] if not divs.empty else 0)
                            if val > 0:
                                print(f"   📅 {ticker_raw}: Anunciado para {ex_date}", flush=True)
                                events.append({
                                    "ticker": ticker_raw,
                                    "date": ex_date.strftime('%Y-%m-%d'),
                                    "total": float(val) * float(pos.quantity),
                                    "value_per_share": float(val),
                                    "status": "Anunciado",
                                    "is_estimate": True
                                })
            except Exception as e:
                print(f"   ⚠️ Erro ao processar {ticker_raw}: {e}", flush=True)
                continue

        print(f"🏁 Fim da busca. {len(events)} eventos.", flush=True)
        events.sort(key=lambda x: x['date'])
        return jsonify(events)
    
    except Exception as e:
        print(f"💥 Erro Geral: {e}", flush=True)
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()