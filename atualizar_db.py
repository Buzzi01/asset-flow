from database.models import init_db

print("🔄 Atualizando estrutura do banco de dados...")
init_db() # O SQLAlchemy é inteligente: ele só cria o que falta (a tabela snapshots)
print("✅ Tabela de Histórico criada com sucesso!")