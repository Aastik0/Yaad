"use client";

import React, { useState } from "react";
import { TrackedItem, ItemObservation, PersonMemory } from "@/types";
import { ImportResult } from "@/lib/repository";
import { X, CloudUpload, CheckCircle2, AlertCircle, Loader2, Sparkles, UserCheck } from "lucide-react";

interface ImportDemoDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  localItems: TrackedItem[];
  localObservations: ItemObservation[];
  localPeople: PersonMemory[];
  onImport: () => Promise<ImportResult>;
  onImportComplete?: (result: ImportResult) => void;
}

export const ImportDemoDataModal: React.FC<ImportDemoDataModalProps> = ({
  isOpen,
  onClose,
  localItems,
  localObservations,
  localPeople,
  onImport,
  onImportComplete,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const res = await onImport();
      setResult(res);
      onImportComplete?.(res);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to import demo data into cloud account.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ivory-50 border border-ivory-300 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 pt-6 pb-4 border-b border-ivory-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-700 text-ivory-50 flex items-center justify-center shadow-xs">
              <CloudUpload className="w-5 h-5 text-sage-200" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-forest-900 tracking-tight">
                Import Demo Belongings to Cloud
              </h2>
              <p className="text-xs text-charcoal-600">
                Explicit, duplicate-safe sync to your authenticated account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-charcoal-800 p-1 rounded-lg hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-forest-900">
                  <CheckCircle2 className="w-4 h-4 text-forest-600" />
                  <span>Import Completed Successfully!</span>
                </div>
                <ul className="space-y-1 text-charcoal-700 list-disc list-inside">
                  <li>Imported items: <strong>{result.importedItems}</strong> {result.skippedItems > 0 && `(${result.skippedItems} already existed)`}</li>
                  <li>Imported observations: <strong>{result.importedObservations}</strong></li>
                  <li>Imported people memories: <strong>{result.importedPeople}</strong> {result.skippedPeople > 0 && `(${result.skippedPeople} already existed)`}</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-charcoal-700 leading-relaxed">
                You have local demo belongings and memories saved in your browser. Would you like to copy them into your private cloud account?
              </p>

              <div className="p-3 rounded-xl bg-ivory-200/60 border border-ivory-300 space-y-2 text-xs">
                <div className="flex items-center justify-between text-charcoal-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                    <span>Tracked Belongings:</span>
                  </span>
                  <span className="font-semibold text-forest-900">{localItems.length} items</span>
                </div>
                <div className="flex items-center justify-between text-charcoal-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-sage-600" />
                    <span>People Memories:</span>
                  </span>
                  <span className="font-semibold text-forest-900">{localPeople.length} people</span>
                </div>
              </div>

              <p className="text-[11px] text-charcoal-500 italic">
                Duplicate safeguard: Any item or person already existing in your cloud account will be preserved without creating duplicates.
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-ivory-300 text-charcoal-700 hover:bg-ivory-200 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-ivory-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-300" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-3.5 h-3.5 text-sage-300" />
                      <span>Confirm Import</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

