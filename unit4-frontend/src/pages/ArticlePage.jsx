import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8001";

// מיפוי תגיות לאנגלית
const TYPE_LABELS = {
    PER: "Person",
    ORG: "Organization",
    LOC: "Location",
    MISC: "Misc"
};

// מיפוי למחלקות שמוגדרות אצלך ב-styles.css
const TYPE_CLASSES = {
    PER: "tag-PER",
    ORG: "tag-ORG",
    LOC: "tag-LOC",
    MISC: "tag-MISC"
};

const ENTITY_CONFIG = {
    PER: { label: "Person", color: "bg-blue-100 text-blue-800 border-blue-200" },
    ORG: { label: "Organization", color: "bg-red-100 text-red-800 border-red-200" },
    LOC: { label: "Location", color: "bg-green-100 text-green-800 border-green-200" },
    MISC: { label: "Misc", color: "bg-purple-100 text-purple-800 border-purple-200" }
};

export default function ArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/articles/${id}`);
        const data = await res.json();
        setArticle(data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  if (loading) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          Loading Article...
      </div>
  );
  
  if (!article) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Article Not Found</h2>
              <button onClick={() => navigate("/")} className="text-blue-600 hover:underline">Return to Home</button>
          </div>
      </div>
  );

  // --- לוגיקה למחיקת כפילויות ישויות ---
  const uniqueEntities = article.ner_arr 
    ? Array.from(new Map(article.ner_arr.map(item => [item.word, item])).values())
    : [];

  return (
    // שינוי ל-RTL כדי שיתאים לשאר האתר
    <div className="min-h-screen bg-[#f8f9fa] pb-20 font-sans" dir="rtl">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-3 px-6 sticky top-0 z-40 flex justify-between items-center shadow-sm">
             <div className="font-black text-xl cursor-pointer tracking-tight text-gray-900" onClick={() => navigate("/")}>
                 <span className="text-red-600">Sham11</span> News
             </div>
             <button 
                onClick={() => navigate("/")} 
                className="text-sm font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-1"
             >
                ✕ Close
             </button>
      </header>

      {/* Main Layout Grid */}
      <div className="container mx-auto max-w-6xl mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10 px-6">
        
        {/* Content Column (2/3 width) - ב-RTL זה יהיה בצד ימין */}
        <article className="lg:col-span-2 bg-white p-8 rounded border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="inline-block bg-black text-white text-xs font-bold px-2 py-1 uppercase rounded">
                    {article.category || "General"}
                </span>
            </div>
            
            <h1 className="text-4xl font-black text-gray-900 mb-4 leading-tight">
                {article.title}
            </h1>

            <div className="text-gray-500 text-sm mb-6 pb-4 border-b border-gray-100 flex items-center gap-2">
                <span>{article.pubDate ? new Date(article.pubDate).toLocaleDateString("en-US") : "Just Now"}</span>
                <span>|</span>
                <span>Source: {article.source || "System"}</span>
            </div>

            {article.image && (
                <img src={article.image} alt="Main" className="w-full h-auto object-cover rounded mb-8" />
            )}

            <div className="prose max-w-none text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                {article.description && (
                    <p className="font-bold text-xl text-gray-900 mb-6 leading-normal border-r-4 border-red-500 pr-4 bg-gray-50 p-4 rounded-l">
                        {article.description}
                    </p>
                )}
                {/* הטקסט מיושר לימין כדי להתאים לעיצוב הכללי, גם אם הוא באנגלית */}
                {article.content}
            </div>
            
             {article.url && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                    {/* הכפתור מיושר לשמאל כדי לתת תחושה של "המשך קריאה" */}
                    <a href={article.url} target="_blank" rel="noreferrer" className="text-blue-700 font-bold hover:underline flex items-center gap-2 justify-end">
                        Read Original Article 
                        {/* חץ מצביע שמאלה (כי ב-RTL זה אומר "הלאה") */}
                        <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </a>
                </div>
            )}
        </article>

        {/* Sidebar Column (1/3 width) - ב-RTL זה יהיה בצד שמאל */}
        <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-white p-6 rounded border border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4 border-b border-red-600 pb-2 inline-block text-gray-900">
                    Detected Entities
                </h3>
                
                {uniqueEntities.length > 0 ? (
                    <div className="flex flex-col">
                        {uniqueEntities.map((entity, idx) => (
                            <div key={idx} className="sidebar-item hover:bg-gray-50 transition-colors cursor-default flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                                {/* Image or Placeholder */}
                                <div className="w-10 h-10 flex-shrink-0">
                                    {entity.image_url ? (
                                        <img src={entity.image_url} alt="" className="w-full h-full object-cover rounded" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-gray-400 font-bold text-xs">
                                            {entity.word.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Text */}
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-gray-900 leading-tight">
                                        {entity.word}
                                    </div>
                                    <span className={`tag-base ${TYPE_CLASSES[entity.entity] || "tag-MISC"} mt-1 inline-block`}>
                                        {TYPE_LABELS[entity.entity] || entity.entity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No entities detected.</p>
                )}
            </div>
        </aside>

      </div>
    </div>
  );
}