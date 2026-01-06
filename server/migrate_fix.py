import sqlite3
import os
import shutil
import sys

# Faz o Python encontrar a pasta 'database' que está na raiz
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.models import Base, engine

# Caminhos dos ficheiros
Target_DB = "assetflow.db"          
Source_DB = "assetflow_TEMP_COPY.db" 

def migrate_inteligente():
    print("🧹 Iniciando Migração Segura (Suporte a Relatórios FNET)...")

    if not os.path.exists(Target_DB):
        print(f"ℹ️ {Target_DB} não encontrado na pasta server. Criando do zero...")
        Base.metadata.create_all(engine)
        print("✨ Estrutura criada com sucesso!")
        return

    print(f"📦 Criando cópia temporária de segurança: {Source_DB}")
    if os.path.exists(Source_DB):
        os.remove(Source_DB)
    shutil.copyfile(Target_DB, Source_DB)

    print("✨ Resetando estrutura para aplicar novas colunas do models.py...")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    
    conn_source = sqlite3.connect(Source_DB)
    conn_target = sqlite3.connect(Target_DB)
    conn_target.execute("PRAGMA foreign_keys = ON;") 
    
    cursor_source = conn_source.cursor()
    cursor_target = conn_target.cursor()

    # Ordem de cópia para respeitar as chaves estrangeiras
    tables = ['categories', 'assets', 'positions', 'market_data', 'snapshots', 'dividends']
    
    for table in tables:
        print(f"🔄 Processando tabela: {table}...")
        try:
            # 1. Obtém as colunas que existiam no banco antigo
            cursor_source.execute(f"PRAGMA table_info({table})")
            source_cols = [c[1] for c in cursor_source.fetchall()]
            
            if not source_cols:
                print(f"   ℹ️ Tabela {table} não existia no banco anterior. Ignorada.")
                continue

            # 2. Obtém as colunas que existem no banco novo (já com as novas colunas)
            cursor_target.execute(f"PRAGMA table_info({table})")
            target_cols = [c[1] for c in cursor_target.fetchall()]

            # 3. Identifica apenas as colunas que existem em AMBOS os bancos
            common_cols = [col for col in source_cols if col in target_cols]
            
            if not common_cols:
                print(f"   ⚠️ Nenhuma coluna em comum para a tabela {table}.")
                continue

            # 4. Busca os dados apenas das colunas comuns
            columns_str = ",".join(common_cols)
            
            # Filtro de asset_id para tabelas filhas (opcional, mas recomendado)
            query = f"SELECT {columns_str} FROM {table}"
            if table in ['positions', 'market_data', 'dividends']:
                query += " WHERE asset_id IS NOT NULL"
                
            cursor_source.execute(query)
            rows = cursor_source.fetchall()
            
            if not rows:
                print(f"   ⚠️ Tabela {table} sem dados para migrar.")
                continue

            # 5. Insere os dados no novo banco
            placeholders = ",".join(["?"] * len(common_cols))
            
            count = 0
            skipped = 0
            for row in rows:
                try:
                    cursor_target.execute(
                        f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})", 
                        row
                    )
                    count += 1
                except sqlite3.IntegrityError:
                    skipped += 1
            
            print(f"   ✅ Salvos: {count} | 🗑️ Duplicados/Lixo: {skipped}")

        except Exception as e:
            print(f"   ❌ Erro na tabela {table}: {e}")

    conn_target.commit()
    conn_source.close()
    conn_target.close()
    
    if os.path.exists(Source_DB):
        os.remove(Source_DB)
        
    print("\n🚀 SUCESSO! Banco reconstruído com suporte às novas colunas de relatórios.")

if __name__ == "__main__":
    migrate_inteligente()