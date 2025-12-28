from flask import Blueprint, jsonify
from sqlalchemy.orm import Session
from database.models import Asset, Position, Category, engine

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    session = Session(bind=engine)
    alerts = []
    
    try:
        # Pega todos os ativos que você TEM na carteira (Position > 0)
        # Não adianta alertar sobre ativo que você já vendeu e zerou.
        positions = session.query(Position).join(Asset).join(Category).filter(Position.quantity > 0).all()

        for pos in positions:
            asset = pos.asset
            
            # 1. Alerta de Preço Zerado ou Desatualizado
            if not asset.current_price or asset.current_price <= 0:
                alerts.append({
                    "id": asset.id,
                    "ticker": asset.ticker,
                    "type": "CRÍTICO",
                    "message": "Sem preço atualizado",
                    "field": "current_price"
                })

            # 2. Alerta de Fundamentos (Apenas para Ações e FIIs)
            if asset.category.name in ['Ação', 'FII']:
                # Verifica DY (Dividend Yield)
                if asset.dy is None: # DY pode ser 0, mas não None
                    alerts.append({
                        "id": asset.id,
                        "ticker": asset.ticker,
                        "type": "AVISO",
                        "message": "Falta Dividend Yield (DY)",
                        "field": "dy"
                    })
                
                # Para ações, verifica LPA e VPA (essenciais para Graham)
                if asset.category.name == 'Ação':
                    if not asset.lpa or asset.lpa == 0:
                        alerts.append({
                            "id": asset.id,
                            "ticker": asset.ticker,
                            "type": "AVISO",
                            "message": "Falta LPA (Lucro/Ação)",
                            "field": "lpa"
                        })
                    if not asset.vpa or asset.vpa == 0:
                        alerts.append({
                            "id": asset.id,
                            "ticker": asset.ticker,
                            "type": "AVISO",
                            "message": "Falta VPA (Valor/Ação)",
                            "field": "vpa"
                        })

        return jsonify(alerts)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()