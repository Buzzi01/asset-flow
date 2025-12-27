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
    qtd: float = Field(ge=0, default=0) # ge=0 significa "Greater or Equal to 0"
    pm: float = Field(ge=0, default=0)

class UpdateInput(BaseModel):
    ticker: str
    qtd: float = Field(ge=0)
    pm: float = Field(ge=0)
    meta: float = Field(ge=0, le=100, default=0) # Meta entre 0 e 100%
    dy: float = Field(default=0)
    lpa: float = Field(default=0)
    vpa: float = Field(default=0)

# --- Rotas ---

# No final de server/routes/assets.py

@assets_bp.route('/api/simulation')
def simulation():
    try:
        # Chama a simulação que criamos no services.py
        result = service.run_monte_carlo_simulation()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500

@assets_bp.route('/api/add_asset', methods=['POST'])
def add_asset():
    try:
        # Validação automática aqui:
        body = AssetInput(**request.json)
        
        # Se passou, acessamos via body.campo
        result = service.add_new_asset(
            body.ticker.upper(), 
            body.category, 
            body.qtd, 
            body.pm
        )
        
        if result["status"] == "Sucesso":
             # Executa update em background se possível, ou síncrono
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
        
        result = service.update_position(
            body.ticker, body.qtd, body.pm, body.meta, 
            body.dy, body.lpa, body.vpa
        )
        
        if result["status"] == "Sucesso":
             service.take_daily_snapshot() 
             
        return jsonify(result)
    except ValidationError as e:
        return jsonify({"status": "Erro", "msg": "Dados inválidos", "detalhe": str(e)}), 400
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500

# (A rota delete_asset pode continuar simples pois só recebe ticker)