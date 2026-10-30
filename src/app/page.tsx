"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { HeroCta } from "@/components/HeroCta";
import { TrackedBelongingsSection } from "@/components/TrackedBelongingsSection";
import { RecentMemoriesFeed } from "@/components/RecentMemoriesFeed";
import { DepartureSimulatorModal } from "@/components/DepartureSimulatorModal";
import { PeopleMemorySection } from "@/components/PeopleMemorySection";
import { CaptureModal } from "@/components/CaptureModal";
import { RecallAnswerCard } from "@/components/RecallAnswerCard";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { DeveloperDrawer } from "@/components/DeveloperDrawer";
import {
  INITIAL_TRACKED_ITEMS,
  INITIAL_OBSERVATIONS,
  INITIAL_PEOPLE_MEMORIES,
  DEMO_USER_ID,
} from "@/data/fixtures";
import {
  getStoredTrackedItems,
  setStoredTrackedItems,
  getStoredObservations,
  setStoredObservations,
  getStoredPeople,
  setStoredPeople,
  resetToFixtures,
} from "@/lib/storage";
import { TrackedItem, ItemObservation, PersonMemory, CandidateItem, GeoLocationCoordinates } from "@/types";
import { ShieldCheck, Info, RotateCcw } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"belongings" | "people">("belongings");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState(false);
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<TrackedItem | null>(null);
  const [dismissedRecallQuery, setDismissedRecallQuery] = useState<string | null>(null);

  // Core state initialized from localStorage with fallback to fixtures
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>(INITIAL_TRACKED_ITEMS);
  const [observations, setObservations] = useState<ItemObservation[]>(INITIAL_OBSERVATIONS);
  const [peopleMemories, setPeopleMemories] = useState<PersonMemory[]>(INITIAL_PEOPLE_MEMORIES);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    setTrackedItems(getStoredTrackedItems());
    setObservations(getStoredObservations());
    setPeopleMemories(getStoredPeople());
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isHydrated) {
      setStoredTrackedItems(trackedItems);
    }
  }, [trackedItems, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      setStoredObservations(observations);
    }
  }, [observations, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      setStoredPeople(peopleMemories);
    }
  }, [peopleMemories, isHydrated]);

  // Unconfirmed items count for badges and departure alerts
  const unconfirmedItems = trackedItems.filter(
    (item) => item.status === "tracked_unconfirmed" || item.status === "possibly_left_behind"
  );

  // Recall matching: find the most relevant tracked item for natural language query
  const recallResult = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 3 || dismissedRecallQuery === searchQuery) return null;

    // Direct name match or keyword token match
    const match = trackedItems.find((item) => {
      const name = item.item_name.toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const loc = item.last_location_description.toLowerCase();
      const nameWords = name.split(/[\s-]+/).filter((w) => w.length > 3);

      return (
        name.includes(q) ||
        q.includes(name) ||
        nameWords.some((w) => q.includes(w)) ||
        (cat && q.includes(cat)) ||
        loc.includes(q) ||
        item.last_landmarks.some((lm) => q.includes(lm.toLowerCase()))
      );
    });

    if (!match) return null;

    const latestObs = observations.find(
      (obs) =>
        obs.item_name.toLowerCase() === match.item_name.toLowerCase() ||
        obs.id === match.last_observation_id
    );

    return { item: match, latestObservation: latestObs };
  }, [searchQuery, trackedItems, observations, dismissedRecallQuery]);

  // Status transitions
  const handleMarkCollected = (id: string) => {
    setTrackedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "collected", updated_at: new Date().toISOString() } : item
      )
    );
  };

  const handleMarkUnconfirmed = (id: string) => {
    setTrackedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "tracked_unconfirmed", updated_at: new Date().toISOString() }
          : item
      )
    );
  };

  const handleMarkLeftBehind = (id: string) => {
    setTrackedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "possibly_left_behind", updated_at: new Date().toISOString() }
          : item
      )
    );
  };

  const handleResolve = (id: string) => {
    setTrackedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "resolved", updated_at: new Date().toISOString() } : item
      )
    );
  };

  // Item update & deletion (privacy requirement)
  const handleUpdateItem = (updated: TrackedItem) => {
    setTrackedItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    if (selectedItemForDetail?.id === updated.id) {
      setSelectedItemForDetail(updated);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const toDelete = trackedItems.find((i) => i.id === itemId);
    setTrackedItems((prev) => prev.filter((item) => item.id !== itemId));
    if (toDelete) {
      setObservations((prev) =>
        prev.filter((obs) => obs.item_name.toLowerCase() !== toDelete.item_name.toLowerCase())
      );
    }
    setSelectedItemForDetail(null);
  };

  const handleDeleteObservation = (id: string) => {
    setObservations((prev) => prev.filter((obs) => obs.id !== id));
  };

  // People Memory Handlers
  const handleAddPerson = (
    personData: Omit<PersonMemory, "id" | "user_id" | "created_at" | "updated_at">
  ) => {
    const newPerson: PersonMemory = {
      id: `person-${Date.now()}`,
      user_id: DEMO_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...personData,
    };
    setPeopleMemories((prev) => [newPerson, ...prev]);
  };

  const handleDeletePerson = (id: string) => {
    setPeopleMemories((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePerson = (updated: PersonMemory) => {
    setPeopleMemories((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  // Reset all to original fixture state
  const handleResetData = () => {
    if (confirm("Reset demo data back to default fixtures?")) {
      resetToFixtures();
      setTrackedItems(INITIAL_TRACKED_ITEMS);
      setObservations(INITIAL_OBSERVATIONS);
      setPeopleMemories(INITIAL_PEOPLE_MEMORIES);
      setSearchQuery("");
      setDismissedRecallQuery(null);
    }
  };

  // Add confirmed candidates from capture modal
  const handleConfirmCandidates = (
    candidates: CandidateItem[],
    imagePreview?: string,
    source?: "browser_upload" | "browser_camera",
    coordinates?: GeoLocationCoordinates
  ) => {
    const now = new Date().toISOString();
    const effectiveSource = source || "browser_upload";

    const newObservations: ItemObservation[] = candidates.map((c) => ({
      id: `obs-${Date.now()}-${c.id}`,
      user_id: DEMO_USER_ID,
      item_name: c.item_name,
      item_category: c.category || "Belonging",
      location_description: c.location_description,
      landmarks: c.landmarks,
      description: c.description,
      confidence: c.confidence,
      observed_at: now,
      source: effectiveSource,
      image_reference: imagePreview,
      coordinates: coordinates,
      user_confirmed: true,
      created_at: now,
    }));

    const newTracked: TrackedItem[] = candidates.map((c) => ({
      id: `item-${Date.now()}-${c.id}`,
      user_id: DEMO_USER_ID,
      item_name: c.item_name,
      category: c.category || "Belonging",
      status: "tracked_unconfirmed",
      last_location_description: c.location_description,
      last_landmarks: c.landmarks,
      last_observed_at: now,
      image_reference: imagePreview,
      coordinates: coordinates,
      geofence_radius_meters: 50,
      updated_at: now,
    }));

    setObservations((prev) => [...newObservations, ...prev]);
    setTrackedItems((prev) => [...newTracked, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100 text-charcoal-900">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unconfirmedCount={unconfirmedItems.length}
        onOpenDevDrawer={() => setIsDevDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Belongings Tracking Tab (Primary USP) */}
        {activeTab === "belongings" && (
          <div className="space-y-8">
            {/* Hero CTA & Search / Recall */}
            <HeroCta
              onCaptureClick={() => setIsCaptureModalOpen(true)}
              onSimulateDeparture={() => setIsDepartureModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setDismissedRecallQuery(null);
              }}
              unconfirmedCount={unconfirmedItems.length}
            />

            {/* Contextual Grounded Recall Answer Card */}
            {recallResult && (
              <RecallAnswerCard
                item={recallResult.item}
                latestObservation={recallResult.latestObservation}
                query={searchQuery}
                onClose={() => setDismissedRecallQuery(searchQuery)}
              />
            )}

            {/* Belongings List Section */}
            <TrackedBelongingsSection
              items={trackedItems}
              onMarkCollected={handleMarkCollected}
              onMarkUnconfirmed={handleMarkUnconfirmed}
              onResolve={handleResolve}
              onSelectItem={(item) => setSelectedItemForDetail(item)}
              searchFilter={searchQuery}
            />

            {/* Recent Observation History Feed */}
            <RecentMemoriesFeed
              observations={observations}
              onDeleteObservation={handleDeleteObservation}
            />
          </div>
        )}

        {/* People Memory Tab (Secondary · Opt-in) */}
        {activeTab === "people" && (
          <PeopleMemorySection
            people={peopleMemories}
            currentUserId={DEMO_USER_ID}
            onAddPerson={handleAddPerson}
            onUpdatePerson={handleUpdatePerson}
            onDeletePerson={handleDeletePerson}
          />
        )}
      </main>

      {/* Modals */}
      <DepartureSimulatorModal
        isOpen={isDepartureModalOpen}
        onClose={() => setIsDepartureModalOpen(false)}
        unconfirmedItems={unconfirmedItems}
        onMarkCollected={handleMarkCollected}
        onMarkLeftBehind={handleMarkLeftBehind}
        onResolve={handleResolve}
      />

      <CaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        onConfirmCandidates={handleConfirmCandidates}
      />

      <ItemDetailModal
        isOpen={!!selectedItemForDetail}
        item={selectedItemForDetail}
        observations={observations}
        onClose={() => setSelectedItemForDetail(null)}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />

      <DeveloperDrawer
        isOpen={isDevDrawerOpen}
        onClose={() => setIsDevDrawerOpen(false)}
      />

      {/* Accessible Footer with Demo Controls */}
      <footer className="mt-auto border-t border-ivory-300 bg-ivory-50/70 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-charcoal-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-forest-700" />
            <span>
              <strong>Yaad</strong> · AI Memory Companion (Meta AI Hackathon Web MVP)
            </span>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-sage-600" />
              Departure check is simulated; no background geofencing claimed.
            </span>
            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-stone-600 hover:text-charcoal-900 hover:bg-ivory-200 border border-ivory-300 transition-colors"
              title="Reset data back to initial demo fixtures"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
