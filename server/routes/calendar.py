from flask import Blueprint, jsonify
from sqlalchemy.orm import Session
from database.models import Asset, Position, Category, engine
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
import pytz

calendar_bp = Blueprint('calendar', __name__)

@calendar_bp.route('/api/calendar', methods=['GET'])
def get_calendar():
    print("📅 JOB: Buscando Agenda (Histórico + Info + Calendar)...")
    session = Session(bind=engine)
    events = []
    
    try:
        positions = session.query(Position).join(Asset).join(Category).filter(
            Category.name.in_(['Ação', 'FII', 'Internacional', 'ETF', 'BDR'])
        ).all()

        tz = pytz.timezone("America/Sao_Paulo")
        today = datetime.now(tz)
        
        # Janela de busca
        start_date = today - timedelta(days=365)
        end_date = today + timedelta(days=365)

        for pos in positions:
            try:
                suffix = ".SA" if not pos.asset.ticker.endswith('.SA') and pos.asset.category.name != 'Internacional' else ""
                ticker = f"{pos.asset.ticker}{suffix}"
                
                stock = yf.Ticker(ticker)
                added_keys = set() # Para não duplicar o mesmo evento

                # ====================================================
                # 1. BUSCA NA LISTA DE DIVIDENDOS (Histórico e Recentes)
                # ====================================================
                try:
                    divs = stock.dividends
                    if not divs.empty:
                        if divs.index.tz is None: divs.index = divs.index.tz_localize(tz)
                        else: divs.index = divs.index.tz_convert(tz)

                        # Filtra
                        mask = (divs.index >= start_date) & (divs.index <= end_date)
                        range_divs = divs.loc[mask]

                        for date, value in range_divs.items():
                            key = f"{ticker}_{date.strftime('%Y-%m-%d')}"
                            total_receber = value * float(pos.quantity)
                            
                            if total_receber > 0.00:
                                is_future = date > today
                                events.append({
                                    "ticker": pos.asset.ticker,
                                    "date": date.strftime('%Y-%m-%d'),
                                    "type": "DATA_COM",
                                    "value_per_share": value,
                                    "total": total_receber,
                                    "status": "Agendado" if is_future else "Pago"
                                })
                                added_keys.add(key)
                except: pass

                # ====================================================
                # 2. BUSCA NA 'INFO' (Onde fica a Próxima Data Com Oficial)
                # ====================================================
                try:
                    info = stock.info
                    # O Yahoo fornece 'exDividendDate' como Timestamp UNIX
                    ex_div_timestamp = info.get('exDividendDate')
                    
                    if ex_div_timestamp:
                        ex_date = datetime.fromtimestamp(ex_div_timestamp, tz)
                        
                        # Se essa data for no futuro e a gente ainda não tiver adicionado ela
                        if ex_date > today:
                            key = f"{ticker}_{ex_date.strftime('%Y-%m-%d')}"
                            if key not in added_keys:
                                # Tenta pegar o valor futuro (dividendRate) ou usa o último conhecido
                                val_futuro = info.get('dividendRate') or 0
                                if val_futuro == 0 and not divs.empty:
                                    val_futuro = divs.iloc[-1] # Estima com o último

                                total_est = val_futuro * float(pos.quantity)
                                
                                events.append({
                                    "ticker": pos.asset.ticker,
                                    "date": ex_date.strftime('%Y-%m-%d'),
                                    "type": "DATA_COM",
                                    "value_per_share": val_futuro,
                                    "total": total_est,
                                    "status": "Confirmado (Info)"
                                })
                                added_keys.add(key)
                                print(f"   🚀 Futuro encontrado no INFO para {pos.asset.ticker}: {ex_date}")
                except Exception as e:
                    # print(f"Erro Info {ticker}: {e}")
                    pass

                # ====================================================
                # 3. BUSCA NO 'CALENDAR' (Previsões)
                # ====================================================
                try:
                    cal = stock.calendar
                    if cal is not None and not cal.empty:
                        future_date = None
                        # Tenta achar a data
                        if isinstance(cal, pd.DataFrame):
                            if 'Dividend Date' in cal.index: future_date = cal.loc['Dividend Date'].iloc[0]
                            elif 'Ex-Dividend Date' in cal.index: future_date = cal.loc['Ex-Dividend Date'].iloc[0]
                            elif 0 in cal.index: future_date = cal.iloc[0, 0] # As vezes é a primeira linha
                        elif isinstance(cal, dict):
                            future_date = cal.get('Dividend Date') or cal.get('Ex-Dividend Date')

                        if future_date:
                            # Trata data
                            if isinstance(future_date, (datetime, pd.Timestamp)):
                                if future_date.tzinfo is None: future_date = future_date.replace(tzinfo=tz)
                                else: future_date = future_date.astimezone(tz)
                            
                            if future_date > today:
                                key = f"{ticker}_{future_date.strftime('%Y-%m-%d')}"
                                if key not in added_keys:
                                    # Estima valor
                                    val_est = 0
                                    if not divs.empty: val_est = divs.iloc[-1]

                                    events.append({
                                        "ticker": pos.asset.ticker,
                                        "date": future_date.strftime('%Y-%m-%d'),
                                        "type": "PREVISÃO",
                                        "value_per_share": val_est, 
                                        "total": val_est * float(pos.quantity),
                                        "status": "Previsão Calendar"
                                    })
                                    added_keys.add(key)
                except: pass

            except Exception: continue

        # Ordena cronologicamente REVERSO (Mais novo/futuro no topo)
        events.sort(key=lambda x: x['date'], reverse=True)

        return jsonify(events)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()