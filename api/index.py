from http.server import BaseHTTPRequestHandler
from datetime import datetime
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        data = {
            "status": "Online",
            "app_name": "AssetFlow",
            "mensagem": "Conexão Python + Next.js estabelecida!",
            "time": str(datetime.now())
        }

        self.wfile.write(json.dumps(data).encode('utf-8'))
        return