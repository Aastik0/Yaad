import type { TrackedItem, ItemObservation, PersonMemory } from "../../types/index.ts";

export interface ImportResult {
  importedItems: number;
  importedObservations: number;
  importedPeople: number;
  skippedItems: number;
  skippedPeople: number;
}

export interface StorageRepository {
  /**
   * Indicates whether this repository is connected to cloud storage (Supabase)
   * or running in local demo mode (localStorage).
   */
  readonly isCloud: boolean;

  // Tracked Items
  getItems(): Promise<TrackedItem[]>;
  saveItem(item: TrackedItem): Promise<TrackedItem>;
  updateItem(id: string, updates: Partial<TrackedItem>): Promise<TrackedItem>;
  deleteItem(id: string): Promise<void>;

  // Item Observations
  getObservations(): Promise<ItemObservation[]>;
  saveObservation(obs: ItemObservation): Promise<ItemObservation>;
  deleteObservation(id: string): Promise<void>;

  // People Memories
  getPeople(): Promise<PersonMemory[]>;
  savePerson(person: PersonMemory): Promise<PersonMemory>;
  updatePerson(id: string, updates: Partial<PersonMemory>): Promise<PersonMemory>;
  deletePerson(id: string): Promise<void>;

  // Explicit user-confirmed import of demo data
  importDemoData(data: {
    items: TrackedItem[];
    observations: ItemObservation[];
    people: PersonMemory[];
  }): Promise<ImportResult>;

  // Reset or clear storage
  resetAll(): Promise<void>;
}
