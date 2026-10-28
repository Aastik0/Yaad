import React from "react";
import { TrackedItem } from "@/types";
import { LogOut, X, AlertTriangle, Check, ShieldAlert } from "lucide-react";

interface DepartureSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  unconfirmedItems: TrackedItem[];
  onMarkCollected: (id: string) => void;
  onMarkLeftBehind: (id: string) => void;
}

export const DepartureSimulatorModal: React.FC<DepartureSimulatorModalProps> = ({
  isOpen,
  onClose,
  unconfirmedItems,
  onMarkCollected,
  onMarkLeftBehind,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-ivory-300 shadow-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-forest-900">
                Departure Check Simulator
              </h2>
              <span className="text-[11px] text-terracotta-700 font-medium">
                Demo simulation · No background geofencing
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3 rounded-xl bg-ivory-100 border border-ivory-300 text-xs text-charcoal-800 leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <span>
              <strong>Truthful departure check:</strong> The system verifies which tracked belongings have not been confirmed as collected before leaving.
            </span>
          </div>

          {unconfirmedItems.length === 0 ? (
            <div className="p-8 text-center bg-forest-50/50 rounded-xl border border-forest-100">
              <div className="w-10 h-10 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-forest-900">
                All tracked belongings are collected!
              </h3>
              <p className="text-xs text-forest-700 mt-1">
                You have confirmed all tracked items. You are ready to move safely.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
                <span>{unconfirmedItems.length} item(s) unconfirmed</span>
                <span>Calm reminder</span>
              </div>

              {unconfirmedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-forest-900">
                      {item.item_name}
                    </span>
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                      Unconfirmed
                    </span>
                  </div>

                  <p className="text-xs text-charcoal-800 leading-relaxed">
                    <span className="font-medium text-stone-600">Last recorded observation: </span>
                    {item.last_location_description}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/50 text-xs">
                    <button
                      onClick={() => onMarkLeftBehind(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-terracotta-200 bg-white hover:bg-terracotta-50 text-terracotta-700 font-medium transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Mark Left Behind
                    </button>
                    <button
                      onClick={() => onMarkCollected(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-800 text-ivory-50 font-medium transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm Collected
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Yaad simulator · Zero hardware dependencies
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-xs font-semibold text-charcoal-800 transition-colors"
          >
            Close Check
          </button>
        </div>
      </div>
    </div>
  );
};

