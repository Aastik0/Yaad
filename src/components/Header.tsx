"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Compass,
  Sparkles,
  UserCheck,
  Glasses,
  ShieldCheck,
  Cloud,
  LogOut,
  LogIn,
  User,
  CloudUpload,
  ChevronDown,
} from "lucide-react";

interface HeaderProps {
  activeTab: "belongings" | "people";
  onTabChange: (tab: "belongings" | "people") => void;
  unconfirmedCount: number;
  onOpenDevDrawer?: () => void;
  onOpenGlassesSimulator?: () => void;
  onOpenAuthModal?: () => void;
  onOpenImportModal?: () => void;
  hasLocalDataToImport?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  unconfirmedCount,
  onOpenDevDrawer,
  onOpenGlassesSimulator,
  onOpenAuthModal,
  onOpenImportModal,
  hasLocalDataToImport,
}) => {
  const { user, signOut, isConfigured } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

          {/* Actions & Status */}
          <div className="flex items-center gap-2">
            <Link
              href="/display"
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-forest-900 hover:bg-forest-800 text-ivory-50 text-xs shadow-2xs transition-colors cursor-pointer"
              title="Open Meta Ray-Ban Display HUD (600x600 Web App)"
            >
              <Glasses className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold hidden sm:inline">Display HUD</span>
            </Link>

            {onOpenGlassesSimulator && (
              <button
                type="button"
                onClick={onOpenGlassesSimulator}
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-forest-50 hover:bg-forest-100 border border-forest-200 text-xs text-forest-800 shadow-2xs transition-colors cursor-pointer"
                title="Launch Meta Ray-Ban Virtual Glasses Simulator (Phase 9)"
              >
                <Glasses className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                <span className="font-semibold hidden sm:inline">Glasses Simulator</span>
              </button>
            )}

            {/* Auth Button or User Profile */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs text-emerald-900 shadow-2xs transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Cloud className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="font-medium max-w-[120px] truncate hidden md:inline">
                    {user.email?.split("@")[0] || "Account"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-emerald-700" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-ivory-50 border border-ivory-300 shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-ivory-200">
                      <p className="text-[11px] text-charcoal-500">Signed in as</p>
                      <p className="font-semibold text-charcoal-900 truncate">{user.email}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Cloud Persistence Active
                      </span>
                    </div>

                    {hasLocalDataToImport && onOpenImportModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenImportModal();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-ivory-200 text-forest-800 flex items-center gap-2 font-medium"
                      >
                        <CloudUpload className="w-3.5 h-3.5 text-forest-600" />
                        <span>Import Demo Items to Cloud</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Sign in or create account to enable cloud persistence"
              >
                <LogIn className="w-3.5 h-3.5 text-sage-200 shrink-0" />
                <span>Sign In</span>
              </button>
            )}

            {/* Developer Drawer / Demo Mode trigger */}
            <button
              type="button"
              onClick={onOpenDevDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-ivory-50 hover:bg-ivory-200 border border-ivory-300 text-xs text-charcoal-700 shadow-2xs transition-colors cursor-pointer"
              title="Click to view Developer Controls, API Usage Ledger & Credit Protection"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-forest-600 shrink-0" />
              <span className="font-medium text-forest-800 hidden xs:inline">
                {user ? "Cloud Synced" : "Demo Mode"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
