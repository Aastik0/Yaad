import React, { useState } from "react";
import { PersonMemory } from "@/types";
import { UserCheck, Shield, Plus, Calendar, MapPin, Trash2, Search } from "lucide-react";

interface PeopleMemorySectionProps {
  people: PersonMemory[];
  onAddPerson: (person: Omit<PersonMemory, "id" | "user_id" | "created_at" | "updated_at">) => void;
  onDeletePerson: (id: string) => void;
}

export const PeopleMemorySection: React.FC<PeopleMemorySectionProps> = ({
  people,
  onAddPerson,
  onDeletePerson,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    display_name: "",
    context_or_relationship: "",
    met_at: "",
    met_on: new Date().toISOString().split("T")[0],
    notes: "",
    user_confirmed: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim()) return;

    onAddPerson(formData);
    setFormData({
      display_name: "",
      context_or_relationship: "",
      met_at: "",
      met_on: new Date().toISOString().split("T")[0],
      notes: "",
      user_confirmed: true,
    });
    setIsAdding(false);
  };

  const filtered = people.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      (p.context_or_relationship && p.context_or_relationship.toLowerCase().includes(q)) ||
      (p.met_at && p.met_at.toLowerCase().includes(q)) ||
      p.notes.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Banner explaining secondary opt-in nature */}
      <div className="p-4 rounded-2xl bg-white border border-ivory-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sage-100 text-forest-800 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-forest-900">
                People Memory (Secondary · Opt-in)
              </h2>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-sage-100 text-forest-800 border border-sage-200">
                Strictly Manual Notes
              </span>
            </div>
            <p className="text-xs text-charcoal-700 mt-1 max-w-2xl leading-relaxed">
              Store helpful personal notes about people you meet. For user privacy, Yaad does not perform facial recognition, bystander detection, or automatic profiling.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? "Cancel" : "Add Person Note"}</span>
        </button>
      </div>

      {/* Add Person Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-5 rounded-2xl border border-sage-200 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold text-forest-900">
            Record a Personal Memory
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Context / How you know them
              </label>
              <input
                type="text"
                value={formData.context_or_relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    context_or_relationship: e.target.value,
                  })
                }
                placeholder="e.g. Hackathon teammate, Product designer"
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Where did you meet?
              </label>
              <input
                type="text"
                value={formData.met_at}
                onChange={(e) =>
                  setFormData({ ...formData, met_at: e.target.value })
                }
                placeholder="e.g. Hacker Lounge Cafe"
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Meeting Date
              </label>
              <input
                type="date"
                value={formData.met_on}
                onChange={(e) =>
                  setFormData({ ...formData, met_on: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1">
              Conversation Notes & Interests *
            </label>
            <textarea
              required
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="e.g. She mentioned she works on accessibility and VoiceOver. Interested in multi-modal LLM reasoning."
              className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-stone-500 flex items-center gap-1">
              <Shield className="w-3 h-3 text-forest-700" />
              Stored locally with explicit user confirmation.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs rounded-lg text-charcoal-700 hover:bg-ivory-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs rounded-lg bg-forest-700 hover:bg-forest-800 text-ivory-50 font-medium"
              >
                Save Person Memory
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search Bar for People Memory */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recall person context: 'Where did I meet Priya?' or 'accessibility'..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
        />
      </div>

      {/* People Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((person) => (
          <div
            key={person.id}
            className="bg-white rounded-xl border border-ivory-300 p-5 shadow-xs space-y-3 relative group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-forest-900">
                  {person.display_name}
                </h3>
                {person.context_or_relationship && (
                  <p className="text-xs text-sage-600 font-medium">
                    {person.context_or_relationship}
                  </p>
                )}
              </div>

              <button
                onClick={() => onDeletePerson(person.id)}
                className="text-stone-300 hover:text-terracotta-600 p-1.5 rounded transition-colors"
                title="Delete person record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-ivory-50 rounded-lg border border-ivory-200 text-xs text-charcoal-800 leading-relaxed">
              {person.notes}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1">
              {person.met_at && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-forest-700" />
                  {person.met_at}
                </span>
              )}
              {person.met_on && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {person.met_on}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

