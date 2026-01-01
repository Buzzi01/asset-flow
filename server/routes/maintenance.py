from flask import Blueprint, jsonify, request
from services import PortfolioService, Session
from database.models import Position

maintenance_bp = Blueprint('maintenance', __name__)
service = PortfolioService()

@maintenance_bp.route('/api/simulation', methods=['GET'])
def simulation():
    return jsonify(service.run_monte_carlo_simulation())

@maintenance_bp.route('/api/update_category_meta', methods=['POST'])
def update_category_meta():
    data = request.json
    result = service.update_category_meta(data.get('category'), data.get('meta'))
    return jsonify(result)

@maintenance_bp.route('/api/cleanup_trash', methods=['GET'])
def cleanup_trash():
    session = Session()
    try:
        positions = session.query(Position).all()
        deleted_count = 0
        for pos in positions:
            if pos.asset is None:
                session.delete(pos)
                deleted_count += 1
        session.commit()
        return jsonify({"status": "Sucesso", "msg": f"Faxina concluída! {deleted_count} itens removidos."})
    except Exception as e:
        session.rollback()
        return jsonify({"status": "Erro", "msg": str(e)})
    finally:
        session.close()