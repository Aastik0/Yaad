"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Compass,
  Sparkles,
  UserCheck,
  Glasses,
  LogOut,
  LogIn,
  CloudUpload,
  ChevronDown,
  Settings,
  ExternalLink,
  Eye,
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
  const { user, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isGlassesMenuOpen, setIsGlassesMenuOpen] = useState(false);

  const glassesMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        glassesMenuRef.current &&
        !glassesMenuRef.current.contains(event.target as Node)
      ) {
        setIsGlassesMenuOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-ivory-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-forest-800 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-charcoal-900">
                  Yaad
                </span>
                <span className="text-[11px] text-stone-500 font-medium hidden sm:inline">
                  · Memory Companion
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center bg-ivory-200/70 p-1 rounded-xl border border-ivory-300/60 shadow-2xs">
            <button
              onClick={() => onTabChange("belongings")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "belongings"
                  ? "bg-white text-forest-950 shadow-xs"
                  : "text-stone-600 hover:text-forest-950"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-forest-700" />
              <span>Belongings</span>
              {unconfirmedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {unconfirmedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange("people")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "people"
                  ? "bg-white text-forest-950 shadow-xs"
                  : "text-stone-600 hover:text-forest-950"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-sage-600" />
              <span>People</span>
            </button>
          </nav>

          {/* Right Actions & Menus */}
          <div className="flex items-center gap-2">
            {/* Smart Glasses Dropdown */}
            <div className="relative" ref={glassesMenuRef}>
              <button
                type="button"
                onClick={() => setIsGlassesMenuOpen(!isGlassesMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ivory-50 hover:bg-ivory-200 border border-ivory-300 text-xs text-forest-950 font-medium transition-colors cursor-pointer shadow-2xs"
                title="Smart Glasses Experience"
              >
                <Glasses className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                <span className="hidden sm:inline">Glasses</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isGlassesMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-ivory-300 shadow-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-1">
                  <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Meta Ray-Ban Wearables
                  </div>

                  {onOpenGlassesSimulator && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsGlassesMenuOpen(false);
                        onOpenGlassesSimulator();
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-forest-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <Glasses className="w-4 h-4 text-forest-700 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-forest-950 block">
                          Virtual Simulator
                        </span>
                        <span className="text-[11px] text-stone-500 block">
                          Test POV capture, recall HUD &amp; departure alerts
                        </span>
                      </div>
                    </button>
                  )}

                  <Link
                    href="/display"
                    target="_blank"
                    onClick={() => setIsGlassesMenuOpen(false)}
                    className="w-full text-left p-2 rounded-lg hover:bg-forest-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-forest-950">
                          600×600 Display HUD
                        </span>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </div>
                      <span className="text-[11px] text-stone-500 block">
                        Full-screen optical monocular waveguide view
                      </span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Auth / Account Profile */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-50 hover:bg-forest-100 border border-forest-200 text-xs text-forest-900 font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="max-w-[100px] truncate hidden md:inline">
                    {user.email?.split("@")[0] || "Account"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-forest-700" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-ivory-300 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-ivory-200">
                      <p className="text-[10px] uppercase font-bold text-stone-400">Signed in as</p>
                      <p className="font-semibold text-charcoal-900 truncate">{user.email}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium mt-0.5">
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
                        className="w-full text-left px-3 py-2 hover:bg-forest-50 text-forest-800 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <CloudUpload className="w-3.5 h-3.5 text-forest-600" />
                        <span>Import Demo Items</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2 font-medium cursor-pointer"
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-ivory-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-sage-200 shrink-0" />
                <span>Sign In</span>
              </button>
            )}

            {/* Developer / API Settings Gear */}
            {onOpenDevDrawer && (
              <button
                type="button"
                onClick={onOpenDevDrawer}
                className="p-2 rounded-xl text-stone-500 hover:text-forest-950 hover:bg-ivory-200 border border-ivory-300/80 transition-colors cursor-pointer shadow-2xs"
                title="Developer Controls, Model Provider &amp; API Usage Ledger"
                aria-label="Developer settings"
              >
                <Settings className="w-4 h-4 text-stone-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
