import sqlite3
import os

def fix():
    # Caminho para o banco de dados (ajuste se necessário)
    db_path = "assetflow.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Banco de dados {db_path} não encontrado!")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔍 Verificando estrutura da tabela 'assets'...")
        cursor.execute("PRAGMA table_info(assets)")
        columns = [c[1] for c in cursor.fetchall()]
        
        if 'cnpj' not in columns:
            print("➕ Adicionando coluna 'cnpj' em 'assets'...")
            cursor.execute("ALTER TABLE assets ADD COLUMN cnpj TEXT;")
            conn.commit()
            print("✅ Coluna 'cnpj' adicionada com sucesso!")
        else:
            print("ℹ️ A coluna 'cnpj' já existe.")
            
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao atualizar banco: {e}")

if __name__ == "__main__":
    fix()