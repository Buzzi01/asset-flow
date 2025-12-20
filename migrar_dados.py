import json
import os
from database.models import init_db, Session, Category, Asset, Position

# 1. Inicializa o Banco (Cria o arquivo assetflow.db)
print("🔨 Criando Banco de Dados...")
init_db()
session = Session()

# Funções auxiliares para ler JSON
def load_json(filename):
    path = os.path.join('server', filename) # Procura na pasta server
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [] if 'carteira' in filename else {}

# 2. Carregar dados antigos
print("📂 Lendo arquivos JSON antigos...")
carteira = load_json('carteira.json')
categorias_meta = load_json('categorias.json')

# 3. Migrar Categorias
print("🔄 Migrando Categorias...")
cat_map = {} # Mapa para saber o ID de cada categoria
tipos_encontrados = set([item['tipo'] for item in carteira])

# Adiciona categorias que estão no JSON de metas + as encontradas na carteira
todas_cats = set(list(categorias_meta.keys()) + list(tipos_encontrados))

for cat_name in todas_cats:
    # Verifica se já existe
    existing = session.query(Category).filter_by(name=cat_name).first()
    if not existing:
        meta = float(categorias_meta.get(cat_name, 0))
        nova_cat = Category(name=cat_name, target_percent=meta)
        session.add(nova_cat)
        session.flush() # Para gerar o ID
        cat_map[cat_name] = nova_cat.id
        print(f"   + Categoria criada: {cat_name} (Meta: {meta}%)")
    else:
        cat_map[cat_name] = existing.id

# 4. Migrar Ativos e Posições
print("🔄 Migrando Ativos e Posições...")
for item in carteira:
    ticker = item['ticker']
    tipo = item['tipo']
    
    # Cria ou Pega Ativo
    asset = session.query(Asset).filter_by(ticker=ticker).first()
    if not asset:
        asset = Asset(
            ticker=ticker,
            category_id=cat_map.get(tipo),
            currency=item.get('moeda', 'BRL')
        )
        session.add(asset)
        session.flush()
        print(f"   + Ativo cadastrado: {ticker}")
    
    # Cria ou Atualiza Posição
    pos = session.query(Position).filter_by(asset_id=asset.id).first()
    if not pos:
        pos = Position(
            asset_id=asset.id,
            quantity=float(item.get('qtd', 0)),
            average_price=float(item.get('pm', 0)),
            target_percent=float(item.get('meta', 0)),
            manual_lpa=item.get('lpa_manual'),
            manual_vpa=item.get('vpa_manual'),
            manual_dy=item.get('dy_proj_12m')
        )
        session.add(pos)
    
session.commit()
print("\n✅ SUCESSO! Migração concluída.")
print("Um arquivo chamado 'assetflow.db' foi criado na raiz.")