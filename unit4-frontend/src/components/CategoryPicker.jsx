import React from "react";

const OPTIONS = [
    { label: "חדשות עיקריות", value: "top" },
    { label: "בידור", value: "entertainment" },
    { label: "חינוך", value: "education" },
    { label: "תיירות", value: "tourism" },
    { label: "בריאות", value: "health" },
    { label: "עסקים", value: "business" },
    { label: "פוליטיקה", value: "politics" },
    { label: "טכנולוגיה", value: "technology" },
    { label: "ספורט", value: "sports" },
    { label: "מדע", value: "science" }
];

export default function CategoryPicker({ value, onChange }) {
    return (
        <div className="relative">
            <select
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block p-2.5 pl-8 cursor-pointer appearance-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">📂 כל הקטגוריות</option>
                {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            {/* חץ מותאם אישית למיקום משמאל (בגלל RTL) */}
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}