"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { HeroCta } from "@/components/HeroCta";
import { TrackedBelongingsSection } from "@/components/TrackedBelongingsSection";
import { RecentMemoriesFeed } from "@/components/RecentMemoriesFeed";
import { DepartureSimulatorModal } from "@/components/DepartureSimulatorModal";
import { PeopleMemorySection } from "@/components/PeopleMemorySection";
import { CaptureModal } from "@/components/CaptureModal";
import {
  INITIAL_TRACKED_ITEMS,
  INITIAL_OBSERVATIONS,
  INITIAL_PEOPLE_MEMORIES,
  DEMO_USER_ID,
} from "@/data/fixtures";
import { TrackedItem, ItemObservation, PersonMemory, CandidateItem } from "@/types";
import { ShieldCheck, Info } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"belongings" | "people">("belongings");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState(false);

  // Core state initialized with realistic fixtures
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>(INITIAL_TRACKED_ITEMS);
  const [observations, setObservations] = useState<ItemObservation[]>(INITIAL_OBSERVATIONS);
  const [peopleMemories, setPeopleMemories] = useState<PersonMemory[]>(INITIAL_PEOPLE_MEMORIES);

  // Unconfirmed items count for badges and departure alerts
  const unconfirmedItems = trackedItems.filter(
    (item) => item.status === "tracked_unconfirmed" || item.status === "possibly_left_behind"
  );

  // Item status transition handlers (BRD Section 8 & Section 9)
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

  // Delete observation (privacy requirement)
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

  // Add confirmed candidates from capture modal
  const handleConfirmCandidates = (
    candidates: CandidateItem[],
    imagePreview?: string,
    source?: "browser_upload" | "browser_camera"
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
              onSearchChange={setSearchQuery}
              unconfirmedCount={unconfirmedItems.length}
            />

            {/* Belongings List Section */}
            <TrackedBelongingsSection
              items={trackedItems}
              onMarkCollected={handleMarkCollected}
              onMarkUnconfirmed={handleMarkUnconfirmed}
              onResolve={handleResolve}
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
            onAddPerson={handleAddPerson}
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
      />

      <CaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        onConfirmCandidates={handleConfirmCandidates}
      />

      {/* Accessible Footer */}
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
          </div>
        </div>
      </footer>
    </div>
  );
}

