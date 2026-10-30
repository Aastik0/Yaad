import React from "react";
import { ShieldCheck, Compass, Sparkles, UserCheck, Glasses } from "lucide-react";

interface HeaderProps {
  activeTab: "belongings" | "people";
  onTabChange: (tab: "belongings" | "people") => void;
  unconfirmedCount: number;
  onOpenDevDrawer?: () => void;
  onOpenGlassesSimulator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  unconfirmedCount,
  onOpenDevDrawer,
  onOpenGlassesSimulator,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-ivory-100/90 backdrop-blur-md border-b border-ivory-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-700 text-ivory-50 flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5 text-sage-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight text-forest-900">
                  Yaad
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-100 font-medium">
                  Web MVP
                </span>
              </div>
              <p className="text-xs text-charcoal-700 hidden sm:block">
                AI memory companion for belongings
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onTabChange("belongings")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === "belongings"
                  ? "bg-forest-700 text-ivory-50 shadow-sm"
                  : "text-charcoal-700 hover:text-forest-900 hover:bg-ivory-200"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Belongings</span>
              {unconfirmedCount > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full font-semibold ${
                    activeTab === "belongings"
                      ? "bg-forest-500 text-ivory-50"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {unconfirmedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange("people")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "people"
                  ? "bg-forest-700 text-ivory-50 shadow-sm"
                  : "text-charcoal-700 hover:text-forest-900 hover:bg-ivory-200"
              }`}
            >
              <UserCheck className="w-4 h-4 text-sage-500" />
              <span>People</span>
              <span className="text-[10px] uppercase tracking-wider text-sage-600 bg-sage-50 px-1.5 py-0.5 rounded border border-sage-200 hidden md:inline">
                Opt-in
              </span>
            </button>
          </nav>

          {/* Actions & Badges */}
          <div className="flex items-center gap-2">
            {onOpenGlassesSimulator && (
              <button
                type="button"
                onClick={onOpenGlassesSimulator}
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-forest-50 hover:bg-forest-100 border border-forest-200 text-xs text-forest-800 shadow-xs transition-colors cursor-pointer"
                title="Launch Meta Ray-Ban Virtual Glasses Simulator (Phase 9)"
              >
                <Glasses className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                <span className="font-semibold hidden sm:inline">Glasses Simulator</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDevDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-ivory-50 hover:bg-ivory-200 border border-ivory-300 text-xs text-charcoal-700 shadow-xs transition-colors cursor-pointer"
              title="Click to view Developer Controls, API Usage Ledger & Credit Protection"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-forest-600 shrink-0" />
              <span className="font-medium text-forest-800 hidden xs:inline">Demo Mode</span>
              <span className="text-[11px] text-stone-500 hidden lg:inline">
                · Zero External Calls
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

