from flask import Blueprint, jsonify
from sqlalchemy.orm import Session
from database.models import Asset, Position, Category, engine

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    session = Session(bind=engine)
    alerts = []
    
    try:
        positions = session.query(Position).join(Asset).join(Category).filter(Position.quantity > 0).all()

        for pos in positions:
            asset = pos.asset
            
            # 👇 CORREÇÃO: Pega o preço da tabela MarketData vinculada ao ativo
            mdata = asset.market_data[0] if asset.market_data else None
            current_price = mdata.price if mdata else 0
            
            # 1. Alerta de Preço
            if current_price <= 0:
                alerts.append({
                    "id": asset.id,
                    "ticker": asset.ticker,
                    "type": "CRÍTICO",
                    "message": "Preço desatualizado ou zerado. Verifique se o ticker está correto.",
                    "field": "current_price"
                })

            # 2. Fundamentos (Ações e FIIs)
            if asset.category.name in ['Ação', 'FII']:
                if pos.manual_dy is None or pos.manual_dy == 0:
                    alerts.append({
                        "id": asset.id,
                        "ticker": asset.ticker,
                        "type": "AVISO",
                        "message": "Dividend Yield (DY) está zerado",
                        "field": "dy"
                    })
                
                if asset.category.name == 'Ação':
                    if pos.manual_lpa is None or pos.manual_lpa == 0:
                        alerts.append({
                            "id": asset.id, "ticker": asset.ticker,
                            "type": "AVISO", "message": "Falta LPA (Lucro/Ação)", "field": "lpa"
                        })
                    if pos.manual_vpa is None or pos.manual_vpa == 0:
                        alerts.append({
                            "id": asset.id, "ticker": asset.ticker,
                            "type": "AVISO", "message": "Falta VPA (Valor/Ação)", "field": "vpa"
                        })

                if asset.category.name == 'FII':
                    if pos.manual_vpa is None or pos.manual_vpa == 0:
                        alerts.append({
                            "id": asset.id, "ticker": asset.ticker,
                            "type": "AVISO", "message": "Falta Valor Patrimonial (VP)", "field": "vpa"
                        })

        return jsonify(alerts)
    
    except Exception as e:
        print(f"🔥 Erro crítico no Alerts API: {e}")
        return jsonify([]) # Retorna lista vazia em vez de erro 500
    finally:
        session.close()