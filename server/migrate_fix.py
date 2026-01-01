import sqlite3
import os
import shutil
import sys

# Faz o Python encontrar a pasta 'database' que está na raiz
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.models import Base, engine

# Como você já deu 'cd server', os caminhos abaixo ficam na pasta atual
Target_DB = "assetflow.db"          
Source_DB = "assetflow_TEMP_COPY.db" 

def migrate_com_filtro():
    print("🧹 Iniciando Migração com NOVA TABELA DE DIVIDENDOS...")

    if not os.path.exists(Target_DB):
        print(f"ℹ️ {Target_DB} não encontrado na pasta server. Criando do zero...")
        Base.metadata.create_all(engine)
        print("✨ Estrutura criada com sucesso!")
        return

    print(f"📦 Criando cópia temporária: {Source_DB}")
    if os.path.exists(Source_DB):
        os.remove(Source_DB)
    shutil.copyfile(Target_DB, Source_DB)

    print("✨ Resetando estrutura e criando tabela de dividendos...")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    
    conn_source = sqlite3.connect(Source_DB)
    conn_target = sqlite3.connect(Target_DB)
    conn_target.execute("PRAGMA foreign_keys = ON;") 
    
    cursor_source = conn_source.cursor()
    cursor_target = conn_target.cursor()

    # Ordem de cópia incluindo 'dividends'
    tables = ['categories', 'assets', 'positions', 'market_data', 'snapshots', 'dividends']
    
    for table in tables:
        print(f"🔄 Processando tabela: {table}...")
        try:
            if table in ['positions', 'market_data', 'dividends']:
                print(f"   🕵️ Filtrando {table}: ignorando linhas com asset_id NULL...")
                cursor_source.execute(f"SELECT * FROM {table} WHERE asset_id IS NOT NULL")
            else:
                cursor_source.execute(f"SELECT * FROM {table}")
                
            rows = cursor_source.fetchall()
            
            if not rows:
                print(f"   ⚠️ Tabela {table} sem dados para migrar.")
                continue

            col_names = [description[0] for description in cursor_source.description]
            placeholders = ",".join(["?"] * len(col_names))
            columns = ",".join(col_names)
            
            count = 0
            skipped = 0
            for row in rows:
                try:
                    cursor_target.execute(
                        f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", 
                        row
                    )
                    count += 1
                except sqlite3.IntegrityError:
                    skipped += 1
            
            print(f"   ✅ Salvos: {count} | 🗑️ Lixo descartado: {skipped}")

        except sqlite3.OperationalError:
            print(f"   ℹ️ Tabela {table} ignorada (Ainda não existia no banco anterior).")
        except Exception as e:
            print(f"   ❌ Erro na tabela {table}: {e}")

    conn_target.commit()
    conn_source.close()
    conn_target.close()
    
    if os.path.exists(Source_DB):
        os.remove(Source_DB)
        
    print("\n🚀 SUCESSO! Banco reconstruído com suporte a Dividendos.")

if __name__ == "__main__":
    migrate_com_filtro()