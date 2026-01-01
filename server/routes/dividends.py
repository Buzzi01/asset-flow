from flask import Blueprint, jsonify
from sqlalchemy.orm import Session
from database.models import Dividend, Asset, engine

dividends_bp = Blueprint('dividends', __name__)

@dividends_bp.route('/api/dividends/history', methods=['GET'])
def get_dividend_history():
    session = Session(bind=engine)
    try:
        # Busca todos os dividendos "carimbados" pelo robô
        history = session.query(Dividend).join(Asset).order_by(Dividend.date_com.desc()).all()
        
        results = []
        for div in history:
            results.append({
                "ticker": div.asset.ticker,
                "date": div.date_com.strftime('%Y-%m-%d'),
                "value_per_share": div.value_per_share,
                "quantity": div.quantity_at_date,
                "total": div.total_value,
                "status": div.status
            })
        return jsonify(results)
    finally:
        session.close()