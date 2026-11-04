"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { GlassesSimulatorModal } from "@/components/GlassesSimulatorModal";
import { AuthModal } from "@/components/AuthModal";
import { ImportDemoDataModal } from "@/components/ImportDemoDataModal";
import { LocationDepartureMonitor } from "@/components/LocationDepartureMonitor";
import { NavigationHandoffCard } from "@/components/NavigationHandoffCard";
import { speakRecallResult, speakNavigationGuidance, speakCalmReminder } from "@/lib/speech";
import {
  DEFAULT_DEMO_COORDINATES,
  resolveItemNavigationStatus,
  NavigationResolutionResult,
  isValidGeoCoordinates,
  isRealDeviceCoordinates,
} from "@/lib/geo";
import {
  INITIAL_TRACKED_ITEMS,
  INITIAL_OBSERVATIONS,
  INITIAL_PEOPLE_MEMORIES,
  DEMO_USER_ID,
} from "@/data/fixtures";
import {
  getStoredTrackedItems,
  getStoredObservations,
  getStoredPeople,
} from "@/lib/storage";
import { getStorageRepository, ImportResult } from "@/lib/repository";
import { useAuth } from "@/contexts/AuthContext";
import { TrackedItem, ItemObservation, PersonMemory, CandidateItem, GeoLocationCoordinates } from "@/types";
import { ShieldCheck, Info, RotateCcw, Cloud, AlertCircle, Compass } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"belongings" | "people">("belongings");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState(false);
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);
  const [isGlassesSimulatorOpen, setIsGlassesSimulatorOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<TrackedItem | null>(null);
  const [dismissedRecallQuery, setDismissedRecallQuery] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [navigationResult, setNavigationResult] = useState<NavigationResolutionResult | null>(null);
  const [activeGpsCoords, setActiveGpsCoords] = useState<GeoLocationCoordinates | null>(null);

  // Active storage repository based on authentication state
  const repository = useMemo(() => getStorageRepository(user), [user]);
  const currentUserId = user?.id || DEMO_USER_ID;

  // Core state
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>(INITIAL_TRACKED_ITEMS);
  const [observations, setObservations] = useState<ItemObservation[]>(INITIAL_OBSERVATIONS);
  const [peopleMemories, setPeopleMemories] = useState<PersonMemory[]>(INITIAL_PEOPLE_MEMORIES);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Check if there is local demo data eligible for cloud import
  const hasLocalDataToImport = useMemo(() => {
    if (typeof window === "undefined" || !user) return false;
    const localItems = getStoredTrackedItems();
    return localItems.length > 0;
  }, [user]);

  // Load data from the active repository (Supabase if authenticated, localStorage if demo)
  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    setSyncError(null);
    try {
      const [items, obs, people] = await Promise.all([
        repository.getItems(),
        repository.getObservations(),
        repository.getPeople(),
      ]);
      setTrackedItems(items);
      setObservations(obs);
      setPeopleMemories(people);
    } catch (err: unknown) {
      console.error("Failed to load data from repository:", err);
      setSyncError((err as Error)?.message || "Failed to sync data.");
    } finally {
      setIsLoadingData(false);
    }
  }, [repository]);

  // Re-hydrate whenever repository changes (e.g. login or logout)
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Unconfirmed items count for badges and departure alerts
  const unconfirmedItems = trackedItems.filter(
    (item) => item.status === "tracked_unconfirmed" || item.status === "possibly_left_behind"
  );

  // Helper to locate a tracked item by search or voice query
  const findMatchingTrackedItem = useCallback(
    (query: string): TrackedItem | null => {
      const q = query.trim().toLowerCase();
      if (q.length < 2) return null;
      return (
        trackedItems.find((item) => {
          const name = item.item_name.toLowerCase();
          const cat = (item.category || "").toLowerCase();
          const loc = item.last_location_description.toLowerCase();
          const nameWords = name.split(/[\s-]+/).filter((w) => w.length > 2);

          return (
            name.includes(q) ||
            q.includes(name) ||
            nameWords.some((w) => q.includes(w)) ||
            (cat && q.includes(cat)) ||
            loc.includes(q) ||
            item.last_landmarks.some((lm) => q.includes(lm.toLowerCase()))
          );
        }) || null
      );
    },
    [trackedItems]
  );

  // Voice Interaction Handlers (Phase 21C / 21E)
  const handleVoiceRecall = useCallback(
    (query: string, targetItem?: string) => {
      const effectiveQuery = targetItem || query;
      setDismissedRecallQuery(null);
      setNavigationResult(null);

      // Support broad inventory inquiries (e.g. "What did I ask you to remember?")
      const isBroadQuery =
        effectiveQuery === "all_belongings" ||
        /^(what did i ask you to remember|what do you remember|what are my belongings|what items are you tracking)/i.test(
          query.trim()
        );

      if (isBroadQuery) {
        setSearchQuery(""); // Clear filter so user sees full list of belongings
        const count = trackedItems.length;
        if (count > 0) {
          const sample = trackedItems
            .map((i) => i.item_name)
            .slice(0, 3)
            .join(", ");
          speakCalmReminder(
            `You asked me to remember ${count} belonging${count > 1 ? "s" : ""}, including ${sample}. All memories reflect past recorded observations.`
          );
        } else {
          speakCalmReminder(
            "You haven't recorded any belongings yet. Tap Remember Belongings to record what you set down."
          );
        }
        return;
      }

      setSearchQuery(effectiveQuery);

      const match = findMatchingTrackedItem(effectiveQuery);
      if (match) {
        speakRecallResult(match.item_name, match.last_location_description);
      } else {
        speakRecallResult(effectiveQuery, null);
      }
    },
    [findMatchingTrackedItem, trackedItems]
  );

  const handleVoiceNavigate = useCallback(
    (query: string, targetItem?: string) => {
      const effectiveQuery = targetItem || query;
      const match = findMatchingTrackedItem(effectiveQuery);
      const resolution = resolveItemNavigationStatus(match, effectiveQuery);
      setNavigationResult(resolution);

      if (match) {
        speakNavigationGuidance(match.item_name, match.last_location_description);
      } else {
        speakNavigationGuidance(effectiveQuery, null);
      }
    },
    [findMatchingTrackedItem]
  );

  // Recall matching: find the most relevant tracked item for natural language query
  const recallResult = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 3 || dismissedRecallQuery === searchQuery) return null;

    const match = findMatchingTrackedItem(searchQuery);
    if (!match) return null;

    const latestObs = observations.find(
      (obs) =>
        obs.item_name.toLowerCase() === match.item_name.toLowerCase() ||
        obs.id === match.last_observation_id
    );

    return { item: match, latestObservation: latestObs };
  }, [searchQuery, observations, dismissedRecallQuery, findMatchingTrackedItem]);

  // Status transitions
  const handleMarkCollected = async (id: string) => {
    const now = new Date().toISOString();
    setTrackedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "collected", updated_at: now } : item))
    );
    try {
      await repository.updateItem(id, { status: "collected" });
    } catch (err) {
      console.error("Failed to update item status in repository:", err);
    }
  };

  const handleMarkUnconfirmed = async (id: string) => {
    const now = new Date().toISOString();
    setTrackedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "tracked_unconfirmed", updated_at: now } : item
      )
    );
    try {
      await repository.updateItem(id, { status: "tracked_unconfirmed" });
    } catch (err) {
      console.error("Failed to update item status in repository:", err);
    }
  };

  const handleMarkLeftBehind = async (id: string) => {
    const now = new Date().toISOString();
    setTrackedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "possibly_left_behind", updated_at: now } : item
      )
    );
    try {
      await repository.updateItem(id, { status: "possibly_left_behind" });
    } catch (err) {
      console.error("Failed to update item status in repository:", err);
    }
  };

  const handleResolve = async (id: string) => {
    const now = new Date().toISOString();
    setTrackedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "resolved", updated_at: now } : item))
    );
    try {
      await repository.updateItem(id, { status: "resolved" });
    } catch (err) {
      console.error("Failed to update item status in repository:", err);
    }
  };

  // Item update & deletion (privacy requirement)
  const handleUpdateItem = async (updated: TrackedItem) => {
    setTrackedItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    if (selectedItemForDetail?.id === updated.id) {
      setSelectedItemForDetail(updated);
    }
    try {
      await repository.updateItem(updated.id, updated);
    } catch (err) {
      console.error("Failed to update item in repository:", err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const toDelete = trackedItems.find((i) => i.id === itemId);
    setTrackedItems((prev) => prev.filter((item) => item.id !== itemId));
    if (toDelete) {
      setObservations((prev) =>
        prev.filter((obs) => obs.item_name.toLowerCase() !== toDelete.item_name.toLowerCase())
      );
    }
    setSelectedItemForDetail(null);
    try {
      await repository.deleteItem(itemId);
    } catch (err) {
      console.error("Failed to delete item from repository:", err);
    }
  };

  const handleDeleteObservation = async (id: string) => {
    setObservations((prev) => prev.filter((obs) => obs.id !== id));
    try {
      await repository.deleteObservation(id);
    } catch (err) {
      console.error("Failed to delete observation from repository:", err);
    }
  };

  // People Memory Handlers
  const handleAddPerson = async (
    personData: Omit<PersonMemory, "id" | "user_id" | "created_at" | "updated_at">
  ) => {
    const now = new Date().toISOString();
    const tempPerson: PersonMemory = {
      id: `temp-${Date.now()}`,
      user_id: currentUserId,
      created_at: now,
      updated_at: now,
      ...personData,
    };
    try {
      const saved = await repository.savePerson(tempPerson);
      setPeopleMemories((prev) => [saved, ...prev]);
    } catch (err) {
      console.error("Failed to save person in repository:", err);
      setPeopleMemories((prev) => [tempPerson, ...prev]);
    }
  };

  const handleDeletePerson = async (id: string) => {
    setPeopleMemories((prev) => prev.filter((p) => p.id !== id));
    try {
      await repository.deletePerson(id);
    } catch (err) {
      console.error("Failed to delete person from repository:", err);
    }
  };

  const handleUpdatePerson = async (updated: PersonMemory) => {
    setPeopleMemories((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    try {
      await repository.updatePerson(updated.id, updated);
    } catch (err) {
      console.error("Failed to update person in repository:", err);
    }
  };

  // Reset data handler
  const handleResetData = async () => {
    const confirmMsg = repository.isCloud
      ? "Reset your cloud storage records back to empty?"
      : "Reset demo data back to default fixtures?";

    if (confirm(confirmMsg)) {
      await repository.resetAll();
      setSearchQuery("");
      setDismissedRecallQuery(null);
      await refreshData();
    }
  };

  // Add confirmed candidates from capture modal
  const handleConfirmCandidates = async (
    candidates: CandidateItem[],
    imagePreview?: string,
    source?: "browser_upload" | "browser_camera",
    coordinates?: GeoLocationCoordinates
  ) => {
    const now = new Date().toISOString();
    const effectiveSource = source || "browser_upload";
    // CRITICAL (Phase 24D): Only accept real, valid device coordinates.
    // NEVER fall back to activeGpsCoords (which may contain simulated walk-away offsets)
    // or DEFAULT_DEMO_COORDINATES (San Francisco).
    // If coordinates are missing, denied, timed out, or simulated, set to undefined.
    const effectiveCoords =
      coordinates && isValidGeoCoordinates(coordinates) && isRealDeviceCoordinates(coordinates)
        ? coordinates
        : undefined;

    for (const c of candidates) {
      const newObs: ItemObservation = {
        id: `obs-${Date.now()}-${c.id}`,
        user_id: currentUserId,
        item_name: c.item_name,
        item_category: c.category || "Belonging",
        location_description: c.location_description,
        landmarks: c.landmarks,
        description: c.description,
        confidence: c.confidence,
        observed_at: now,
        source: effectiveSource,
        image_reference: imagePreview,
        coordinates: effectiveCoords,
        user_confirmed: true,
        created_at: now,
      };

      const newTracked: TrackedItem = {
        id: `item-${Date.now()}-${c.id}`,
        user_id: currentUserId,
        item_name: c.item_name,
        category: c.category || "Belonging",
        status: "tracked_unconfirmed",
        last_location_description: c.location_description,
        last_landmarks: c.landmarks,
        last_observed_at: now,
        image_reference: imagePreview,
        coordinates: effectiveCoords,
        geofence_radius_meters: 50,
        updated_at: now,
      };

      try {
        const savedObs = await repository.saveObservation(newObs);
        const savedItem = await repository.saveItem({
          ...newTracked,
          last_observation_id: savedObs.id,
          image_reference: savedObs.image_reference,
        });

        setObservations((prev) => [savedObs, ...prev]);
        setTrackedItems((prev) => [savedItem, ...prev]);
      } catch (err) {
        console.error("Failed to persist confirmed candidate:", err);
        setSyncError((err as Error)?.message || "Failed to persist candidate to cloud.");
        // Fallback optimistic update
        setObservations((prev) => [newObs, ...prev]);
        setTrackedItems((prev) => [newTracked, ...prev]);
      }
    }
  };

  // Explicit demo data migration handler
  const handleImportDemoData = async (): Promise<ImportResult> => {
    const res = await repository.importDemoData({
      items: getStoredTrackedItems(),
      observations: getStoredObservations(),
      people: getStoredPeople(),
    });
    await refreshData();
    return res;
  };

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100 text-charcoal-900">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unconfirmedCount={unconfirmedItems.length}
        onOpenDevDrawer={() => setIsDevDrawerOpen(true)}
        onOpenGlassesSimulator={() => setIsGlassesSimulatorOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        hasLocalDataToImport={hasLocalDataToImport}
      />

      {/* Local Data Import Notice (Only if there are offline demo items to migrate) */}
      {user && hasLocalDataToImport && (
        <div className="bg-forest-50 border-b border-forest-200/80 py-2 px-4 text-xs text-forest-900">
          <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-forest-700 shrink-0" />
              <span>You have items saved locally on this browser. Would you like to import them to your account?</span>
            </span>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-forest-700 text-ivory-50 hover:bg-forest-800 font-medium transition-colors text-xs shrink-0 cursor-pointer"
            >
              Import Items
            </button>
          </div>
        </div>
      )}

      {/* Sync Error Notice if any */}
      {syncError && (
        <div className="bg-red-50 border-b border-red-200 py-1.5 px-4 text-xs text-red-800">
          <div className="max-w-6xl w-full mx-auto flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Sync Warning: {syncError}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Belongings Tracking Tab (Primary USP) */}
        {activeTab === "belongings" && (
          <div className="space-y-8">
            {/* Hero CTA & Unified Search / Voice Recall */}
            <HeroCta
              onCaptureClick={() => setIsCaptureModalOpen(true)}
              onSimulateDeparture={() => setIsDepartureModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setDismissedRecallQuery(null);
              }}
              unconfirmedCount={unconfirmedItems.length}
              onVoiceRecall={handleVoiceRecall}
              onVoiceNavigate={handleVoiceNavigate}
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

            {/* Grounded Navigation Handoff Card (Phase 21E) */}
            {navigationResult && (
              <NavigationHandoffCard
                resolution={navigationResult}
                onMarkCollected={handleMarkCollected}
                onClose={() => setNavigationResult(null)}
              />
            )}

            {/* Ambient Departure Guard & Breach Alerts (Phase 21D) */}
            <LocationDepartureMonitor
              unconfirmedItems={unconfirmedItems}
              onMarkCollected={handleMarkCollected}
              onMarkLeftBehind={handleMarkLeftBehind}
              onLocationUpdate={(coords) => setActiveGpsCoords(coords)}
            />

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
            currentUserId={currentUserId}
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

      <GlassesSimulatorModal
        isOpen={isGlassesSimulatorOpen}
        onClose={() => setIsGlassesSimulatorOpen(false)}
        currentCoords={activeGpsCoords || DEFAULT_DEMO_COORDINATES}
        onConfirmCandidates={handleConfirmCandidates}
        trackedItems={trackedItems}
        onMarkCollected={handleMarkCollected}
        onMarkLeftBehind={handleMarkLeftBehind}
        peopleMemories={peopleMemories}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          refreshData();
        }}
      />

      <ImportDemoDataModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        localItems={getStoredTrackedItems()}
        localObservations={getStoredObservations()}
        localPeople={getStoredPeople()}
        onImport={handleImportDemoData}
        onImportComplete={() => {
          refreshData();
        }}
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-stone-600 hover:text-charcoal-900 hover:bg-ivory-200 border border-ivory-300 transition-colors cursor-pointer"
              title={repository.isCloud ? "Reset cloud data" : "Reset data back to initial demo fixtures"}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{repository.isCloud ? "Clear Cloud Items" : "Reset Demo Data"}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
