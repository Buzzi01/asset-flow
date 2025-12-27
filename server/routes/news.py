from flask import Blueprint, jsonify
import feedparser
from urllib.parse import quote  # 👈 Importação essencial adicionada

news_bp = Blueprint('news', __name__)

@news_bp.route('/api/news/<ticker>', methods=['GET'])
def get_news(ticker):
    try:
        # Define o termo de busca
        search_query = f"{ticker} mercado financeiro"
        
        # 🛡️ CORREÇÃO: Codifica a URL para transformar espaços em %20
        encoded_query = quote(search_query)
        
        # Monta a URL do RSS segura
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
        
        # Faz o parse do feed
        feed = feedparser.parse(rss_url)
        
        news_list = []
        # Pega as 5 primeiras notícias para não poluir o frontend
        for entry in feed.entries[:5]:
            news_list.append({
                "title": entry.title,
                "link": entry.link,
                "published": entry.published,
                "source": entry.source.title if hasattr(entry, 'source') else "Google News"
            })
            
        return jsonify(news_list), 200

    except Exception as e:
        print(f"Erro ao buscar notícias para {ticker}: {str(e)}")
        # Retorna lista vazia em vez de quebrar o app
        return jsonify([]), 200