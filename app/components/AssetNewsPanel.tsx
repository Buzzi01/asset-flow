import { useState, useEffect } from 'react';
import { X, ExternalLink, Newspaper } from 'lucide-react'; // Instale lucide-react se não tiver

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string;
}

interface Props {
  ticker: string | null;
  onClose: () => void;
}

export default function AssetNewsPanel({ ticker, onClose }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticker) {
      setLoading(true);
      // Busca no seu backend Python
      fetch(`http://localhost:5328/api/news/${ticker}`)
        .then(res => res.json())
        .then(data => {
          setNews(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [ticker]);

  // Se não tiver ticker selecionado, não renderiza nada (ou renderiza fechado)
  if (!ticker) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 p-6 overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Newspaper size={20} className="text-emerald-500" />
          {ticker} News
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition">
          <X size={24} />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-800 rounded-lg"></div>
          ))}
        </div>
      )}

      {/* Lista de Notícias */}
      {!loading && (
        <div className="space-y-4">
          {news.length === 0 ? (
            <p className="text-gray-500">Nenhuma notícia recente encontrada.</p>
          ) : (
            news.map((item, idx) => (
              <a 
                key={idx} 
                href={item.link} 
                target="_blank" 
                rel="noreferrer"
                className="block p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-emerald-500/50 transition group"
              >
                <h3 className="text-sm font-medium text-gray-200 mb-2 group-hover:text-emerald-400">
                  {item.title}
                </h3>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{item.source}</span>
                  <ExternalLink size={12} />
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}