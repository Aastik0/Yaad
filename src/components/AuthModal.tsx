"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { X, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Shield, Loader2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signIn, signUp, error, clearError, isConfigured } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessNotice(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const res = await signIn(email, password);
        if (res.success) {
          onSuccess?.();
          onClose();
        }
      } else {
        const res = await signUp(email, password);
        if (res.success) {
          if (res.message) {
            setSuccessNotice(res.message);
          } else {
            onSuccess?.();
            onClose();
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeSwitch = (newMode: "signin" | "signup") => {
    setMode(newMode);
    clearError();
    setSuccessNotice(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ivory-50 border border-ivory-300 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-ivory-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-700 text-ivory-50 flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5 text-sage-200" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-forest-900 tracking-tight">
                {mode === "signin" ? "Sign In to Yaad" : "Create Yaad Account"}
              </h2>
              <p className="text-xs text-charcoal-600">
                {mode === "signin"
                  ? "Access your cloud-synced belongings & memory context"
                  : "Start persisting your items and familiar people safely"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-charcoal-800 p-1 rounded-lg hover:bg-ivory-200 transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Notice if Supabase keys not set */}
        {!isConfigured && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Supabase is not yet configured.</p>
              <p className="text-amber-700 mt-0.5">
                Yaad is running in local Demo Mode. You can explore all features offline without signing in.
              </p>
            </div>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-ivory-200/80 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => handleModeSwitch("signin")}
              className={`py-2 rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-white text-forest-900 shadow-xs font-semibold"
                  : "text-charcoal-600 hover:text-forest-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("signup")}
              className={`py-2 rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-white text-forest-900 shadow-xs font-semibold"
                  : "text-charcoal-600 hover:text-forest-900"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 flex items-start gap-2.5 text-xs text-forest-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-charcoal-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sage-600" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-ivory-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-forest-500 focus:border-forest-500 text-charcoal-900 placeholder:text-stone-400 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-charcoal-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sage-600" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-ivory-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-forest-500 focus:border-forest-500 text-charcoal-900 placeholder:text-stone-400 shadow-2xs"
            />
            {mode === "signup" && (
              <p className="text-[11px] text-charcoal-500">Minimum 6 characters.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isConfigured}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-ivory-50 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sage-300" />
                <span>{mode === "signin" ? "Signing In..." : "Creating Account..."}</span>
              </>
            ) : (
              <>
                <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="w-4 h-4 text-sage-300" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-charcoal-500 hover:text-forest-800 underline transition-colors"
            >
              Continue in Demo Mode (Local Storage only)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

