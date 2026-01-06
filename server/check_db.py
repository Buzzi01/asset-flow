import sqlite3
import os

db_path = "assetflow.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(positions);")
    columns = cursor.fetchall()
    for col in columns:
        if col[1] == 'last_report_at':
            print(f"\n✅ Coluna: {col[1]} | Tipo no Banco: {col[2]}")
            if col[2].upper() in ['DATETIME', 'TIMESTAMP']:
                print("❌ ERRO: O banco ainda está como DATETIME. A migração falhou ou o arquivo errado foi editado.")
            else:
                print("🚀 SUCESSO: O banco está como TEXT/VARCHAR. O erro de TypeError deve sumir após reiniciar o app.")
    conn.close()
else:
    print("Arquivo assetflow.db não encontrado.")