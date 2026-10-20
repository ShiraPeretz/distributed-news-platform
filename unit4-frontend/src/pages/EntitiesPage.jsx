import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8001";

// הגדרת צבעים ותוויות (כמו בעיצוב המקורי)
const ENTITY_CONFIG = {
    PER: { label: "PERSON", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    ORG: { label: "ORGANIZATION", color: "bg-gray-100 text-gray-700 border-gray-200" },
    LOC: { label: "LOCATION", color: "bg-red-100 text-red-700 border-red-200" },
    MISC: { label: "MISC", color: "bg-purple-100 text-purple-700 border-purple-200" }
};

export default function EntitiesPage() {
  const navigate = useNavigate();
  const [entitiesList, setEntitiesList] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/items/recent`);
        const data = await res.json();
        
        const entityMap = {};
        
        (data.data || []).forEach(article => {
          if (article.ner_arr) {
            article.ner_arr.forEach(entity => {
              // מפתח ייחודי לישות (לפי מילה וסוג)
              const key = `${entity.word}-${entity.entity}`; 
              
              if (!entityMap[key]) {
                entityMap[key] = {
                  ...entity,
                  count: 0,
                  articles: []
                };
              }
              
              // הגדלת מונה הופעות
              entityMap[key].count += 1;
              
              // --- תיקון קריטי לכפילויות ---
              // בודקים האם כתבה עם אותה כותרת כבר קיימת ברשימה של הישות הזו
              const alreadyExists = entityMap[key].articles.some(
                  existingArticle => existingArticle.title === article.title
              );
              
              // רק אם היא לא קיימת - מוסיפים אותה
              if (!alreadyExists) {
                  entityMap[key].articles.push({ 
                      id: article.id, 
                      title: article.title 
                  });
              }
            });
          }
        });
        
        // המרה לרשימה ומיון לפי כמות הופעות
        setEntitiesList(Object.values(entityMap).sort((a, b) => b.count - a.count));
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  // סינון לפי חיפוש וסוג
  const filteredEntities = entitiesList.filter(entity => {
    const matchesType = selectedType === "all" || entity.entity === selectedType;
    const matchesSearch = entity.word.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // חישוב סטטיסטיקות
  const stats = {
    TOTAL: entitiesList.length,
    PER: entitiesList.filter(e => e.entity === "PER").length,
    ORG: entitiesList.filter(e => e.entity === "ORG").length,
    LOC: entitiesList.filter(e => e.entity === "LOC").length,
    MISC: entitiesList.filter(e => e.entity === "MISC").length
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900" dir="rtl">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-black text-white font-black text-lg px-2 py-1 rounded shadow-sm">
                    NER
                </div>
                <h1 className="text-xl font-bold tracking-tight">אינדקס ישויות</h1>
            </div>

            <button 
                onClick={() => navigate("/")} 
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                חזרה לחדשות
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        
        {/* סרגל סינון וחיפוש */}
        <div className="bg-white border border-gray-300 rounded-lg p-5 mb-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-6">
                
                {/* כפתורי סינון */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'all', label: 'הכל', count: stats.TOTAL },
                        { id: 'PER', label: 'אישים', count: stats.PER },
                        { id: 'ORG', label: 'ארגונים', count: stats.ORG },
                        { id: 'LOC', label: 'מקומות', count: stats.LOC },
                        { id: 'MISC', label: 'אחר', count: stats.MISC }
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => setSelectedType(btn.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                                selectedType === btn.id 
                                ? 'bg-gray-900 text-white border-gray-900' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            {btn.label} <span className="opacity-60 text-xs mr-1">({btn.count})</span>
                        </button>
                    ))}
                </div>

                {/* תיבת חיפוש */}
                <div className="relative w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder="חיפוש ישות..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block p-2.5 pr-10"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>
        </div>

        {/* גריד הישויות */}
        {loading ? (
            <div className="flex justify-center py-20 text-gray-500 font-medium">טוען נתונים...</div>
        ) : filteredEntities.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-lg">
                <div className="text-4xl mb-3 opacity-50">🔍</div>
                <h3 className="text-lg font-bold text-gray-700">לא נמצאו תוצאות</h3>
                <button onClick={() => { setSearchTerm(""); setSelectedType("all"); }} className="text-blue-600 hover:underline mt-2 font-medium">
                    נקה חיפוש
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEntities.map((entity, idx) => {
                    // שליפת הגדרות הצבע לפי סוג הישות
                    const styleConfig = ENTITY_CONFIG[entity.entity] || ENTITY_CONFIG.MISC;
                    
                    return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all flex flex-col h-full group">
                            
                            {/* חלק עליון: תמונה, שם ותגית */}
                            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-100">
                                {/* תמונה */}
                                <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                                    {entity.image_url ? (
                                        <img src={entity.image_url} alt={entity.word} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
                                            {entity.word.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                
                                {/* פרטים */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-gray-900 truncate mb-1 leading-tight" title={entity.word}>
                                            {entity.word}
                                        </h3>
                                        <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                                            x{entity.count}
                                        </span>
                                    </div>
                                    {/* תגית צבעונית */}
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${styleConfig.color}`}>
                                        {styleConfig.label}
                                    </span>
                                </div>
                            </div>

                            {/* רשימת כתבות (ללא כפילויות) */}
                            <div className="mt-auto">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider text-right">הופיע לאחרונה ב:</p>
                                <div className="space-y-2">
                                    {entity.articles.slice(0, 3).map((article, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => navigate(`/article/${article.id}`)}
                                            className="text-xs text-gray-600 hover:text-blue-600 hover:underline cursor-pointer truncate flex items-center gap-2"
                                            title={article.title}
                                        >
                                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0"></span>
                                            {article.title}
                                        </div>
                                    ))}
                                    {entity.articles.length > 3 && (
                                        <div className="text-[10px] text-gray-400 font-medium pr-3.5">
                                            + עוד {entity.articles.length - 3} כתבות
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}