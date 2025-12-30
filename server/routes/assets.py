# server/routes/assets.py
from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field, ValidationError
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from services import PortfolioService

assets_bp = Blueprint('assets', __name__)
service = PortfolioService()

# --- Schemas de Validação ---
class AssetInput(BaseModel):
    ticker: str = Field(..., min_length=1, strip_whitespace=True)
    category: str = Field(..., min_length=1)
    qtd: float = Field(ge=0, default=0)
    pm: float = Field(ge=0, default=0)
    meta: float = Field(ge=0, default=0) # 👈 Adicionado campo META

class UpdateInput(BaseModel):
    ticker: str
    qtd: float = Field(ge=0)
    pm: float = Field(ge=0)
    meta: float = Field(ge=0, le=100, default=0)
    dy: float = Field(default=0)
    lpa: float = Field(default=0)
    vpa: float = Field(default=0)
    manual_price: float = Field(default=None)

# --- Rotas ---

@assets_bp.route('/api/simulation')
def simulation():
    try:
        result = service.run_monte_carlo_simulation()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500

@assets_bp.route('/api/add_asset', methods=['POST'])
def add_asset():
    try:
        # Validação automática com Pydantic
        body = AssetInput(**request.json)
        
        result = service.add_new_asset(
            body.ticker.upper(), 
            body.category, 
            body.qtd, 
            body.pm,
            body.meta # 👈 Passando a meta para o serviço
        )
        
        if result["status"] == "Sucesso":
             try: service.update_prices(); service.take_daily_snapshot()
             except: pass
             
        return jsonify(result)
        
    except ValidationError as e:
        return jsonify({"status": "Erro", "msg": "Dados inválidos", "errors": e.errors()}), 400
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500

@assets_bp.route('/api/update_asset', methods=['POST'])
def update_asset():
    try:
        body = UpdateInput(**request.json)
        
        # 👇 2. Passamos o manual_price para o serviço
        result = service.update_position(
            ticker=body.ticker, 
            qtd=body.qtd, 
            pm=body.pm, 
            meta=body.meta, 
            dy=body.dy, 
            lpa=body.lpa, 
            vpa=body.vpa,
            current_price=body.manual_price # <--- Passando aqui
        )
        
        if result["status"] == "Sucesso":
             service.take_daily_snapshot() 
             
        return jsonify(result)
    except ValidationError as e:
        return jsonify({"status": "Erro", "msg": "Dados inválidos", "detalhe": str(e)}), 400
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500

@assets_bp.route('/api/delete_asset', methods=['POST'])
def delete_asset():
    data = request.json
    asset_id = data.get('id')
    
    if not asset_id:
        return jsonify({"status": "Erro", "msg": "ID não informado"})
    
    service = PortfolioService()
    result = service.delete_asset(asset_id)
    return jsonify(result)