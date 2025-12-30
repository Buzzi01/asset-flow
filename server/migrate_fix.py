import sqlite3
import os
import shutil
from database.models import Base, engine

# Configuração de arquivos
Target_DB = "assetflow.db"          # Banco oficial (que será limpo)
Source_DB = "assetflow_TEMP_COPY.db" # Cópia de segurança (de onde leremos)

def migrate_com_filtro():
    print("🧹 Iniciando Migração com FILTRO ANTI-NULL...")

    # 1. Verifica se o banco existe
    if not os.path.exists(Target_DB):
        print(f"❌ Arquivo {Target_DB} não encontrado.")
        return

    # 2. Cria a CÓPIA de segurança (para ler os dados sem travar o Docker)
    print(f"📦 Criando cópia temporária: {Source_DB}")
    if os.path.exists(Source_DB):
        os.remove(Source_DB)
    shutil.copyfile(Target_DB, Source_DB)

    # 3. ZERA o banco oficial e recria as tabelas (Agora com as regras blindadas do models.py)
    print("✨ Resetando estrutura do banco oficial (Drop/Create)...")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    
    # 4. Conecta nos dois bancos
    conn_source = sqlite3.connect(Source_DB) # Ler do velho
    conn_target = sqlite3.connect(Target_DB) # Escrever no novo
    
    # Ativa verificação de chaves no novo
    conn_target.execute("PRAGMA foreign_keys = ON;") 
    
    cursor_source = conn_source.cursor()
    cursor_target = conn_target.cursor()

    # --- ORDEM DE CÓPIA ---
    tables = ['categories', 'assets', 'positions', 'market_data', 'snapshots']
    
    for table in tables:
        print(f"🔄 Processando tabela: {table}...")
        try:
            # 👇 O SEGREDO: FILTRAR O LIXO NA FONTE
            if table in ['positions', 'market_data']:
                # Só pega se asset_id NÃO FOR NULO
                print(f"   🕵️ Filtrando {table}: ignorando linhas com asset_id NULL...")
                cursor_source.execute(f"SELECT * FROM {table} WHERE asset_id IS NOT NULL")
            else:
                # Tabelas normais pegam tudo
                cursor_source.execute(f"SELECT * FROM {table}")
                
            rows = cursor_source.fetchall()
            
            if not rows:
                print("   ⚠️ Tabela vazia ou sem dados válidos.")
                continue

            # Prepara a inserção
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
                except sqlite3.IntegrityError as e:
                    # Se der erro (ex: ID órfão que não existe na tabela assets), ignora
                    skipped += 1
            
            print(f"   ✅ Salvos: {count} | 🗑️ Lixo descartado: {skipped}")

        except Exception as e:
            print(f"   ❌ Erro na tabela {table}: {e}")

    # 5. Finaliza
    conn_target.commit()
    conn_source.close()
    conn_target.close()
    
    # Remove a cópia
    if os.path.exists(Source_DB):
        os.remove(Source_DB)
        
    print("\n🚀 SUCESSO! O banco foi reconstruído sem as linhas NULL.")

if __name__ == "__main__":
    migrate_com_filtro()