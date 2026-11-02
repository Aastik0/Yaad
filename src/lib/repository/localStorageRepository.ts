import type { TrackedItem, ItemObservation, PersonMemory } from "../../types/index.ts";
import type { StorageRepository, ImportResult } from "./types.ts";
import {
  getStoredTrackedItems,
  setStoredTrackedItems,
  getStoredObservations,
  setStoredObservations,
  getStoredPeople,
  setStoredPeople,
  resetToFixtures,
} from "../storage.ts";

export class LocalStorageRepository implements StorageRepository {
  readonly isCloud = false;

  async getItems(): Promise<TrackedItem[]> {
    return getStoredTrackedItems();
  }

  async saveItem(item: TrackedItem): Promise<TrackedItem> {
    const items = getStoredTrackedItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.unshift(item);
    }
    setStoredTrackedItems(items);
    return item;
  }

  async updateItem(id: string, updates: Partial<TrackedItem>): Promise<TrackedItem> {
    const items = getStoredTrackedItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Item with id "${id}" not found`);
    }
    const updated: TrackedItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    items[index] = updated;
    setStoredTrackedItems(items);
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    const items = getStoredTrackedItems();
    const filtered = items.filter((i) => i.id !== id);
    setStoredTrackedItems(filtered);
  }

  async getObservations(): Promise<ItemObservation[]> {
    return getStoredObservations();
  }

  async saveObservation(obs: ItemObservation): Promise<ItemObservation> {
    const list = getStoredObservations();
    const index = list.findIndex((o) => o.id === obs.id);
    if (index >= 0) {
      list[index] = obs;
    } else {
      list.unshift(obs);
    }
    setStoredObservations(list);
    return obs;
  }

  async deleteObservation(id: string): Promise<void> {
    const list = getStoredObservations();
    const filtered = list.filter((o) => o.id !== id);
    setStoredObservations(filtered);
  }

  async getPeople(): Promise<PersonMemory[]> {
    return getStoredPeople();
  }

  async savePerson(person: PersonMemory): Promise<PersonMemory> {
    const people = getStoredPeople();
    const index = people.findIndex((p) => p.id === person.id);
    if (index >= 0) {
      people[index] = person;
    } else {
      people.unshift(person);
    }
    setStoredPeople(people);
    return person;
  }

  async updatePerson(id: string, updates: Partial<PersonMemory>): Promise<PersonMemory> {
    const people = getStoredPeople();
    const index = people.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Person with id "${id}" not found`);
    }
    const updated: PersonMemory = {
      ...people[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    people[index] = updated;
    setStoredPeople(people);
    return updated;
  }

  async deletePerson(id: string): Promise<void> {
    const people = getStoredPeople();
    const filtered = people.filter((p) => p.id !== id);
    setStoredPeople(filtered);
  }

  async importDemoData(): Promise<ImportResult> {
    return {
      importedItems: 0,
      importedObservations: 0,
      importedPeople: 0,
      skippedItems: 0,
      skippedPeople: 0,
    };
  }

  async resetAll(): Promise<void> {
    resetToFixtures();
  }
}
