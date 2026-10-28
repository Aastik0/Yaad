import React from "react";
import { Camera, LogOut, Search } from "lucide-react";

interface HeroCtaProps {
  onCaptureClick: () => void;
  onSimulateDeparture: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unconfirmedCount: number;
}

export const HeroCta: React.FC<HeroCtaProps> = ({
  onCaptureClick,
  onSimulateDeparture,
  searchQuery,
  onSearchChange,
  unconfirmedCount,
}) => {
  return (
    <section className="bg-ivory-50 border border-ivory-300 rounded-2xl p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Column: Headline and description */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sage-50 text-sage-700 text-xs font-medium border border-sage-200 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
            Grounded observation · Truthful memory
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-forest-900">
            Never leave your essentials behind.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-charcoal-700 leading-relaxed">
            Record what you set down, ground items to real landmarks, and get a calm reminder before you depart.
          </p>
        </div>

        {/* Right Column: Main action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={onCaptureClick}
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-forest-700 text-ivory-50 hover:bg-forest-800 text-sm font-medium transition-all shadow-sm active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2"
          >
            <Camera className="w-4 h-4 text-sage-200" />
            <span>Remember belongings</span>
          </button>

          <button
            onClick={onSimulateDeparture}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-charcoal-800 border border-ivory-300 text-sm font-medium transition-all"
            title="Explicit browser departure simulator"
          >
            <LogOut className="w-4 h-4 text-terracotta-600" />
            <span>Demo: Simulate leaving</span>
            {unconfirmedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                {unconfirmedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Grounded Search / Recall Bar */}
      <div className="mt-6 pt-6 border-t border-ivory-200/80">
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-700">
            <Search className="w-4 h-4 text-stone-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search recalled items... e.g. 'Where did I last leave my keys?'"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-ivory-300 text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600 transition-colors shadow-xs"
          />
        </div>
      </div>
    </section>
  );
};

