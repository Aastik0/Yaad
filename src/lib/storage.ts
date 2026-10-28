import { TrackedItem, ItemObservation, PersonMemory } from "@/types";
import {
  INITIAL_TRACKED_ITEMS,
  INITIAL_OBSERVATIONS,
  INITIAL_PEOPLE_MEMORIES,
} from "@/data/fixtures";

const STORAGE_KEYS = {
  TRACKED_ITEMS: "yaad_tracked_items_v1",
  OBSERVATIONS: "yaad_observations_v1",
  PEOPLE: "yaad_people_v1",
};

export const getStoredTrackedItems = (): TrackedItem[] => {
  if (typeof window === "undefined") return INITIAL_TRACKED_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRACKED_ITEMS);
    if (!raw) return INITIAL_TRACKED_ITEMS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_TRACKED_ITEMS;
  }
};

export const setStoredTrackedItems = (items: TrackedItem[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.TRACKED_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to persist tracked items to localStorage:", err);
  }
};

export const getStoredObservations = (): ItemObservation[] => {
  if (typeof window === "undefined") return INITIAL_OBSERVATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS);
    if (!raw) return INITIAL_OBSERVATIONS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_OBSERVATIONS;
  }
};

export const setStoredObservations = (obs: ItemObservation[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.OBSERVATIONS, JSON.stringify(obs));
  } catch (err) {
    console.error("Failed to persist observations to localStorage:", err);
  }
};

export const getStoredPeople = (): PersonMemory[] => {
  if (typeof window === "undefined") return INITIAL_PEOPLE_MEMORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PEOPLE);
    if (!raw) return INITIAL_PEOPLE_MEMORIES;
    return JSON.parse(raw);
  } catch {
    return INITIAL_PEOPLE_MEMORIES;
  }
};

export const setStoredPeople = (people: PersonMemory[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(people));
  } catch (err) {
    console.error("Failed to persist people to localStorage:", err);
  }
};

export const resetToFixtures = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.TRACKED_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.OBSERVATIONS);
    localStorage.removeItem(STORAGE_KEYS.PEOPLE);
  } catch (err) {
    console.error("Failed to reset localStorage:", err);
  }
};

