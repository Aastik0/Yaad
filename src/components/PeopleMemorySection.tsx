import React, { useState } from "react";
import { PersonMemory } from "@/types";
import {
  UserCheck,
  Shield,
  Plus,
  Calendar,
  MapPin,
  Trash2,
  Search,
  Edit2,
  Check,
  Clock,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";

interface PeopleMemorySectionProps {
  people: PersonMemory[];
  currentUserId?: string;
  onAddPerson: (person: Omit<PersonMemory, "id" | "user_id" | "created_at" | "updated_at">) => void;
  onUpdatePerson: (person: PersonMemory) => void;
  onDeletePerson: (id: string) => void;
}

export const PeopleMemorySection: React.FC<PeopleMemorySectionProps> = ({
  people,
  currentUserId,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  // Add Form State
  const [formData, setFormData] = useState({
    display_name: "",
    context_or_relationship: "",
    met_at: "",
    met_on: new Date().toISOString().split("T")[0],
    notes: "",
    user_confirmed: true,
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState<{
    id: string;
    display_name: string;
    context_or_relationship: string;
    met_at: string;
    met_on: string;
    notes: string;
  }>({
    id: "",
    display_name: "",
    context_or_relationship: "",
    met_at: "",
    met_on: "",
    notes: "",
  });

  // User-isolated records list
  const userScopedPeople = currentUserId
    ? people.filter((p) => p.user_id === currentUserId)
    : people;

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingPersonId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim()) return;

    onAddPerson({
      display_name: formData.display_name.trim(),
      context_or_relationship: formData.context_or_relationship.trim() || undefined,
      met_at: formData.met_at.trim() || undefined,
      met_on: formData.met_on || undefined,
      notes: formData.notes.trim(),
      user_confirmed: true,
    });

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

  const handleStartEdit = (person: PersonMemory) => {
    setEditingPersonId(person.id);
    setIsAdding(false);
    setEditFormData({
      id: person.id,
      display_name: person.display_name,
      context_or_relationship: person.context_or_relationship || "",
      met_at: person.met_at || "",
      met_on: person.met_on || "",
      notes: person.notes,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const original = userScopedPeople.find((p) => p.id === editFormData.id);
    if (!original || !editFormData.display_name.trim()) return;

    onUpdatePerson({
      ...original,
      display_name: editFormData.display_name.trim(),
      context_or_relationship: editFormData.context_or_relationship.trim() || undefined,
      met_at: editFormData.met_at.trim() || undefined,
      met_on: editFormData.met_on || undefined,
      notes: editFormData.notes.trim(),
      updated_at: new Date().toISOString(),
    });

    setEditingPersonId(null);
  };

  const handleDelete = (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete your saved memory of "${name}"? This action cannot be undone.`
    );
    if (confirmed) {
      onDeletePerson(id);
    }
  };

  // Search filtering
  const q = search.trim().toLowerCase();
  const filtered = userScopedPeople.filter((p) => {
    if (!q) return true;
    return (
      p.display_name.toLowerCase().includes(q) ||
      (p.context_or_relationship && p.context_or_relationship.toLowerCase().includes(q)) ||
      (p.met_at && p.met_at.toLowerCase().includes(q)) ||
      p.notes.toLowerCase().includes(q)
    );
  });

  // Grounded Q&A Assistant for People Memory (e.g. "Where did I meet Priya?", "What did Priya say?")
  const groundedRecallResult = React.useMemo(() => {
    if (q.length < 3) return null;

    // Check if query is asking about a specific person
    const matchedPerson = userScopedPeople.find((p) => {
      const nameParts = p.display_name.toLowerCase().split(" ");
      return nameParts.some((part) => part.length > 2 && q.includes(part));
    });

    if (!matchedPerson) return null;

    const isWhereQuestion = q.includes("where") || q.includes("location") || q.includes("place");
    const isWhenQuestion = q.includes("when") || q.includes("date") || q.includes("time");

    let answerExcerpt = "";
    if (isWhereQuestion && matchedPerson.met_at) {
      answerExcerpt = `You recorded meeting ${matchedPerson.display_name} at ${matchedPerson.met_at}${
        matchedPerson.met_on ? ` on ${matchedPerson.met_on}` : ""
      }.`;
    } else if (isWhenQuestion && matchedPerson.met_on) {
      answerExcerpt = `You recorded meeting ${matchedPerson.display_name} on ${matchedPerson.met_on}${
        matchedPerson.met_at ? ` at ${matchedPerson.met_at}` : ""
      }.`;
    } else {
      answerExcerpt = `From your saved notes about ${matchedPerson.display_name}: "${matchedPerson.notes}"`;
    }

    return {
      person: matchedPerson,
      answer: answerExcerpt,
    };
  }, [q, userScopedPeople]);

  return (
    <div className="space-y-6">
      {/* Banner explaining secondary opt-in nature */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-ivory-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-100 text-forest-800 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-forest-900">
                People Memory (Secondary · Opt-in)
              </h2>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-sage-100 text-forest-800 border border-sage-200">
                User-Authored Notes
              </span>
            </div>
            <p className="text-xs text-charcoal-700 mt-1 max-w-2xl leading-relaxed">
              Privately remember context, names, and conversation details about people you meet. For your safety and dignity, Yaad <strong>never performs facial recognition</strong>, automated bystander profiling, or image scanning.
            </p>
          </div>
        </div>

        <button
          onClick={() => (isAdding ? setIsAdding(false) : handleStartAdd())}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? "Cancel" : "Add Person Note"}</span>
        </button>
      </div>

      {/* Add Person Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white p-5 rounded-2xl border border-sage-200 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
            <h3 className="text-sm font-semibold text-forest-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-forest-700" />
              <span>Record a Personal Memory</span>
            </h3>
            <span className="text-[11px] text-stone-500">
              Requires explicit confirmation
            </span>
          </div>

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
                placeholder="e.g. Meta AI Hackathon collaborator"
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
              Conversation Notes &amp; Interests *
            </label>
            <textarea
              required
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="e.g. She works on digital accessibility and VoiceOver. Lives in Seattle."
              className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-stone-500 flex items-center gap-1">
              <Shield className="w-3 h-3 text-forest-700" />
              Stored privately with explicit user confirmation.
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
                className="px-4 py-1.5 text-xs rounded-lg bg-forest-700 hover:bg-forest-800 text-ivory-50 font-medium shadow-xs"
              >
                Save Person Memory
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Edit Person Form */}
      {editingPersonId && (
        <form
          onSubmit={handleSaveEdit}
          className="bg-white p-5 rounded-2xl border border-forest-300 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
            <h3 className="text-sm font-semibold text-forest-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-forest-700" />
              <span>Edit Person Memory</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingPersonId(null)}
              className="p-1 text-stone-400 hover:text-charcoal-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editFormData.display_name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, display_name: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Context / How you know them
              </label>
              <input
                type="text"
                value={editFormData.context_or_relationship}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    context_or_relationship: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Where did you meet?
              </label>
              <input
                type="text"
                value={editFormData.met_at}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, met_at: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1">
                Meeting Date
              </label>
              <input
                type="date"
                value={editFormData.met_on}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, met_on: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-700 mb-1">
              Conversation Notes &amp; Interests *
            </label>
            <textarea
              required
              rows={3}
              value={editFormData.notes}
              onChange={(e) =>
                setEditFormData({ ...editFormData, notes: e.target.value })
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingPersonId(null)}
              className="px-3 py-1.5 text-xs rounded-lg text-charcoal-700 hover:bg-ivory-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs rounded-lg bg-forest-700 hover:bg-forest-800 text-ivory-50 font-medium shadow-xs"
            >
              Update Memory
            </button>
          </div>
        </form>
      )}

      {/* Grounded Natural-Language Recall Box */}
      {groundedRecallResult && (
        <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 sm:p-5 shadow-xs relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-forest-700 text-ivory-50 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-sage-200" />
            </div>
            <span className="text-xs font-semibold text-forest-900 uppercase tracking-wider">
              Grounded People Recall
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-sage-200 space-y-1">
            <p className="text-sm text-charcoal-900 leading-relaxed font-medium">
              {groundedRecallResult.answer}
            </p>
            <p className="text-[11px] text-stone-500">
              Source: Explicitly confirmed user note · Stored {new Date(groundedRecallResult.person.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Search Bar for People Memory */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recall person context: 'Where did I meet Priya?' or 'accessibility' or 'Seattle'..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600 shadow-xs"
        />
      </div>

      {/* People Memory Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-ivory-300 text-charcoal-700">
          <p className="text-sm font-medium">No person memories found.</p>
          <p className="text-xs mt-1 text-stone-500">
            {search.trim()
              ? "Try adjusting your search terms or adding a new note above."
              : "Click 'Add Person Note' above to record someone you have met."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((person) => (
            <div
              key={person.id}
              className="bg-white rounded-xl border border-ivory-300 p-5 shadow-xs space-y-3 relative group flex flex-col justify-between"
            >
              <div className="space-y-2">
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

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(person)}
                      className="text-stone-400 hover:text-forest-800 p-1.5 rounded hover:bg-ivory-100 transition-colors"
                      title="Edit person memory"
                      aria-label={`Edit ${person.display_name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(person.id, person.display_name)}
                      className="text-stone-300 hover:text-terracotta-600 p-1.5 rounded hover:bg-terracotta-50 transition-colors"
                      title="Delete person record"
                      aria-label={`Delete ${person.display_name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* User Notes */}
                <div className="p-3 bg-ivory-50 rounded-lg border border-ivory-200 text-xs text-charcoal-800 leading-relaxed">
                  <span className="text-[10px] uppercase font-semibold text-stone-400 block mb-1">
                    User-entered memory:
                  </span>
                  {person.notes}
                </div>
              </div>

              {/* Metadata Footer: Met At, Met On, Timestamp */}
              <div className="pt-2 border-t border-ivory-200 flex items-center justify-between text-[11px] text-stone-500 flex-wrap gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {person.met_at && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-forest-700 shrink-0" />
                      <span>{person.met_at}</span>
                    </span>
                  )}
                  {person.met_on && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{person.met_on}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-stone-400">
                  <Clock className="w-3 h-3" />
                  <span>
                    Saved {new Date(person.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
