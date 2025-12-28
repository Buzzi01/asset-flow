import sqlite3

def migrate():
    print("🔄 Iniciando migração do banco de dados...")
    
    # Conecta no seu banco atual
    conn = sqlite3.connect('assetflow.db')
    cursor = conn.cursor()
    
    try:
        # Tenta adicionar a coluna RSI
        cursor.execute("ALTER TABLE market_data ADD COLUMN rsi_14 FLOAT")
        print("✅ Coluna 'rsi_14' adicionada com sucesso.")
    except sqlite3.OperationalError:
        print("⚠️ Coluna 'rsi_14' já existe (ignorando).")

    try:
        # Tenta adicionar a coluna SMA
        cursor.execute("ALTER TABLE market_data ADD COLUMN sma_20 FLOAT")
        print("✅ Coluna 'sma_20' adicionada com sucesso.")
    except sqlite3.OperationalError:
        print("⚠️ Coluna 'sma_20' já existe (ignorando).")

    conn.commit()
    conn.close()
    print("🚀 Migração concluída! Seus dados estão salvos.")

if __name__ == "__main__":
    migrate()