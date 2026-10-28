import React from "react";
import { TrackedItemStatus } from "@/types";
import { CheckCircle2, AlertTriangle, Eye, HelpCircle, CheckCheck } from "lucide-react";

interface StatusChipProps {
  status: TrackedItemStatus;
  size?: "sm" | "md";
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = "md" }) => {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  switch (status) {
    case "tracked_unconfirmed":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Tracked · Unconfirmed
        </span>
      );

    case "collected":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-forest-50 text-forest-700 border border-forest-100 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
          Collected
        </span>
      );

    case "possibly_left_behind":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-terracotta-50 text-terracotta-700 border border-terracotta-200 ${sizeClasses}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-terracotta-600" />
          Possibly Left Behind
        </span>
      );

    case "suggested":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 ${sizeClasses}`}
        >
          <Eye className="w-3.5 h-3.5 text-stone-500" />
          Suggested
        </span>
      );

    case "resolved":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-sage-50 text-sage-700 border border-sage-200 ${sizeClasses}`}
        >
          <CheckCheck className="w-3.5 h-3.5 text-sage-600" />
          Resolved
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 ${sizeClasses}`}
        >
          <HelpCircle className="w-3 h-3 text-gray-400" />
          Unknown
        </span>
      );
  }
};

