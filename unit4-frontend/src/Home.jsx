import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NewsCard from "./components/NewsCard.jsx";
import CategoryPicker from "./components/CategoryPicker.jsx";

const WS_URL = "ws://127.0.0.1:8001/ws";
const API_BASE = "http://127.0.0.1:8001";

export default function Home() {
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingNews, setFetchingNews] = useState(false);
  const navigate = useNavigate();

  // --- לוגיקה מקורית (נשמרה במלואה) ---
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log("🟢 WebSocket opened");
    ws.onmessage = (event) => {
      const newArticle = JSON.parse(event.data);
      setNews((prev) => [newArticle, ...prev]);
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/items/recent`);
        const data = await res.json();
        setNews(data.data || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    let filtered = news;
    if (categoryFilter) {
      filtered = filtered.filter((item) => item.category?.toLowerCase() === categoryFilter.toLowerCase());
    }
    if (entityFilter) {
      filtered = filtered.filter((item) =>
        item.ner_arr?.some((ent) => ent.word.toLowerCase().includes(entityFilter.toLowerCase()))
      );
    }
    setFilteredNews(filtered);
  }, [news, categoryFilter, entityFilter]);

  const handleFetchNews = async () => {
    setFetchingNews(true);
    try {
      await fetch(`${API_BASE}/api/news/fetch`, { method: "POST" });
      setTimeout(() => setFetchingNews(false), 2000);
    } catch (err) {
      setFetchingNews(false);
    }
  };

  // --- עיצוב חדש (Solid Design) ---
  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-gray-900" dir="rtl">
      
      {/* Header מקצועי ולבן */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* לוגו חדש - תואם לעמוד הכתבה */}
            <div className="cursor-pointer" onClick={() => window.location.reload()}>
                <h1 className="font-black text-3xl tracking-tight leading-none text-gray-900">
                    <span className="text-red-600">Sham11</span> News
                </h1>
            </div>

            {/* כפתורים - עיצוב סולידי */}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleFetchNews} 
                disabled={fetchingNews} 
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                {fetchingNews ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>{fetchingNews ? "טוען..." : "טען חדשות"}</span>
              </button>

              <button 
                onClick={() => navigate("/entities")} 
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-5 py-2.5 rounded-lg font-medium shadow-sm hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                חקור ישויות
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* אזור הסינון - קופסה לבנה */}
      <div className="container mx-auto px-6 py-8">
        <div className="bg-white border border-gray-300 rounded-lg p-5 shadow-sm flex flex-wrap items-center gap-4">
          
          <div className="w-full md:w-64">
            <CategoryPicker value={categoryFilter} onChange={setCategoryFilter} />
          </div>

          <div className="flex-1 relative min-w-[200px]">
            <input 
              type="text" 
              placeholder="חיפוש חופשי (אדם, מקום...)" 
              value={entityFilter} 
              onChange={(e) => setEntityFilter(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50"
            />
            {entityFilter && (
              <button 
                onClick={() => setEntityFilter("")} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-4 border-r border-gray-300 pr-6 mr-2">
            <div className="text-center">
              <span className="block text-2xl font-bold text-gray-900">{filteredNews.length}</span>
              <span className="text-xs text-gray-500 font-medium">מוצגים</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-gray-400">{news.length}</span>
              <span className="text-xs text-gray-500 font-medium">סה"כ</span>
            </div>
          </div>
        </div>
      </div>

      {/* גריד החדשות */}
      <div className="container mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex justify-center py-20 text-gray-500 font-medium text-lg">
            טוען נתונים...
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="bg-white border border-gray-300 rounded-lg p-16 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">לא נמצאו תוצאות</h3>
            <p className="text-gray-500 mb-6">נסה לשנות את מסנני החיפוש</p>
            <button onClick={() => { setCategoryFilter(""); setEntityFilter(""); }} className="text-blue-600 font-bold hover:underline">
              נקה סינון
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNews.map((item, idx) => (
              <NewsCard key={item.id || idx} article={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}