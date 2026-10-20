import React from "react";
import { useNavigate } from "react-router-dom";

// צבעים סולידיים לקטגוריות (במקום גרדיאנטים)
const CATEGORY_STYLES = {
  top: "bg-red-100 text-red-800 border-red-200",
  entertainment: "bg-pink-100 text-pink-800 border-pink-200",
  education: "bg-blue-100 text-blue-800 border-blue-200",
  tourism: "bg-teal-100 text-teal-800 border-teal-200",
  health: "bg-green-100 text-green-800 border-green-200",
  business: "bg-purple-100 text-purple-800 border-purple-200",
  politics: "bg-gray-100 text-gray-800 border-gray-200",
  technology: "bg-indigo-100 text-indigo-800 border-indigo-200",
  sports: "bg-orange-100 text-orange-800 border-orange-200",
  science: "bg-cyan-100 text-cyan-800 border-cyan-200"
};

// צבעי ישויות נקיים
const ENTITY_STYLES = {
  PER: "bg-blue-50 text-blue-700 border-blue-100",
  ORG: "bg-red-50 text-red-700 border-red-100",
  LOC: "bg-green-50 text-green-700 border-green-100",
  MISC: "bg-gray-50 text-gray-700 border-gray-200"
};

export default function NewsCard({ article }) {
  const navigate = useNavigate();
  const categoryStyle = CATEGORY_STYLES[article.category?.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <div 
        onClick={() => navigate(`/article/${article.id}`)} 
        className="group cursor-pointer bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200 h-full flex flex-col"
    >
        {/* תמונה */}
        <div className="relative h-48 overflow-hidden bg-gray-100 border-b border-gray-100">
            {article.image ? (
                <img 
                    src={article.image} 
                    alt={article.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    onError={(e) => e.target.src = "https://via.placeholder.com/400x300?text=No+Image"} 
                />
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400 font-bold">
                    אין תמונה
                </div>
            )}
            
            {/* תג קטגוריה בתוך התמונה */}
            <div className="absolute top-3 left-3">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase border shadow-sm ${categoryStyle}`}>
                    {article.category || "כללי"}
                </span>
            </div>
        </div>

        {/* תוכן */}
        <div className="p-5 flex flex-col flex-1">
            <h3 className="text-lg font-bold text-gray-900 leading-snug mb-3 line-clamp-2 group-hover:text-blue-700 transition-colors">
                {article.title}
            </h3>

            {article.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                    {article.description}
                </p>
            )}

            {/* ישויות (NER) */}
            {article.ner_arr && article.ner_arr.length > 0 && (
                <div className="mt-auto mb-4">
                    <div className="flex flex-wrap gap-2">
                        {article.ner_arr.slice(0, 4).map((entity, idx) => (
                            <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ENTITY_STYLES[entity.entity] || ENTITY_STYLES.MISC}`}>
                                {entity.word}
                            </span>
                        ))}
                        {article.ner_arr.length > 4 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                +{article.ner_arr.length - 4}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-4 mt-auto border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {article.pubDate ? new Date(article.pubDate).toLocaleDateString("he-IL") : "עכשיו"}
                </div>
                <span className="group-hover:translate-x-[-4px] transition-transform text-blue-600 font-bold">
                    קרא עוד ←
                </span>
            </div>
        </div>
    </div>
  );
}