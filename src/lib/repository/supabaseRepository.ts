import { SupabaseClient } from "@supabase/supabase-js";
import type { TrackedItem, ItemObservation, PersonMemory, GeoLocationCoordinates } from "../../types/index.ts";
import type { Database } from "../supabase/types.ts";
import type { StorageRepository, ImportResult } from "./types.ts";
import { uploadSceneSnapshot, deleteSceneSnapshot } from "../supabase/storage.ts";
import {
  TrackedItemInputSchema,
  ItemObservationInputSchema,
  PersonMemoryInputSchema,
} from "../schemas.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  // Generate a valid v4 UUID
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SupabaseRepository implements StorageRepository {
  readonly isCloud = true;
  private readonly client: SupabaseClient<Database>;
  private readonly userId: string;

  constructor(client: SupabaseClient<Database>, userId: string) {
    if (!userId) {
      throw new Error("Security Exception: SupabaseRepository requires an authenticated user ID.");
    }
    this.client = client;
    this.userId = userId;
  }

  async getItems(): Promise<TrackedItem[]> {
    const { data, error } = await this.client
      .from("items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch items from Supabase:", error);
      throw new Error(`Failed to load items: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      item_name: row.item_name,
      category: row.category ?? undefined,
      status: row.status,
      last_observation_id: row.last_observation_id ?? undefined,
      last_location_description: row.last_location_description,
      last_landmarks: row.last_landmarks || [],
      last_observed_at: row.last_observed_at,
      image_reference: row.image_reference ?? undefined,
      coordinates: (row.coordinates as unknown as GeoLocationCoordinates) ?? undefined,
      geofence_radius_meters: row.geofence_radius_meters,
      updated_at: row.updated_at,
    }));
  }

  async saveItem(item: TrackedItem): Promise<TrackedItem> {
    // Validate input schema
    const validated = TrackedItemInputSchema.parse(item);
    const itemId = ensureUUID(item.id);

    // If base64 data URL, upload to private Supabase Storage and store only the path
    let finalImageRef: string | null = validated.image_reference ?? null;
    if (finalImageRef && finalImageRef.startsWith("data:")) {
      try {
        finalImageRef = await uploadSceneSnapshot(this.client, this.userId, itemId, finalImageRef);
      } catch (uploadErr) {
        console.error("Could not upload item image to storage:", uploadErr);
        throw new Error(`Storage Error: ${(uploadErr as Error)?.message || "Failed to upload image"}`);
      }
    }

    const row = {
      id: itemId,
      user_id: this.userId, // Strictly enforce current authenticated user
      item_name: validated.item_name,
      category: validated.category ?? null,
      status: validated.status,
      last_observation_id: validated.last_observation_id && UUID_REGEX.test(validated.last_observation_id)
        ? validated.last_observation_id
        : null,
      last_location_description: validated.last_location_description,
      last_landmarks: validated.last_landmarks,
      last_observed_at: validated.last_observed_at || new Date().toISOString(),
      image_reference: finalImageRef,
      coordinates: validated.coordinates ? JSON.parse(JSON.stringify(validated.coordinates)) : null,
      geofence_radius_meters: validated.geofence_radius_meters,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from("items")
      .upsert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to save item in Supabase:", error);
      throw new Error(`Failed to save item: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      item_name: data.item_name,
      category: data.category ?? undefined,
      status: data.status,
      last_observation_id: data.last_observation_id ?? undefined,
      last_location_description: data.last_location_description,
      last_landmarks: data.last_landmarks || [],
      last_observed_at: data.last_observed_at,
      image_reference: data.image_reference ?? undefined,
      coordinates: (data.coordinates as unknown as GeoLocationCoordinates) ?? undefined,
      geofence_radius_meters: data.geofence_radius_meters,
      updated_at: data.updated_at,
    };
  }

  async updateItem(id: string, updates: Partial<TrackedItem>): Promise<TrackedItem> {
    if (!UUID_REGEX.test(id)) {
      throw new Error(`Invalid item ID: "${id}". Must be a valid UUID.`);
    }

    const payload: Database["public"]["Tables"]["items"]["Update"] = {
      updated_at: new Date().toISOString(),
    };

    if (updates.item_name !== undefined) payload.item_name = updates.item_name.trim();
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.last_observation_id !== undefined) {
      payload.last_observation_id = UUID_REGEX.test(updates.last_observation_id || "")
        ? updates.last_observation_id
        : null;
    }
    if (updates.last_location_description !== undefined) {
      payload.last_location_description = updates.last_location_description;
    }
    if (updates.last_landmarks !== undefined) payload.last_landmarks = updates.last_landmarks;
    if (updates.last_observed_at !== undefined) payload.last_observed_at = updates.last_observed_at;
    if (updates.image_reference !== undefined) payload.image_reference = updates.image_reference;
    if (updates.coordinates !== undefined) {
      payload.coordinates = updates.coordinates ? JSON.parse(JSON.stringify(updates.coordinates)) : null;
    }
    if (updates.geofence_radius_meters !== undefined) {
      payload.geofence_radius_meters = updates.geofence_radius_meters;
    }

    const { data, error } = await this.client
      .from("items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update item in Supabase:", error);
      throw new Error(`Failed to update item: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      item_name: data.item_name,
      category: data.category ?? undefined,
      status: data.status,
      last_observation_id: data.last_observation_id ?? undefined,
      last_location_description: data.last_location_description,
      last_landmarks: data.last_landmarks || [],
      last_observed_at: data.last_observed_at,
      image_reference: data.image_reference ?? undefined,
      coordinates: (data.coordinates as unknown as GeoLocationCoordinates) ?? undefined,
      geofence_radius_meters: data.geofence_radius_meters,
      updated_at: data.updated_at,
    };
  }

  async deleteItem(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      return; // If not a valid UUID, it does not exist in Supabase
    }
    const { data: itemToDelete } = await this.client
      .from("items")
      .select("image_reference")
      .eq("id", id)
      .maybeSingle();

    if (itemToDelete?.image_reference) {
      // Check if any active observation still references this image before removing from storage
      const { data: obsUsingImage } = await this.client
        .from("observations")
        .select("id")
        .eq("image_reference", itemToDelete.image_reference)
        .is("deleted_at", null)
        .limit(1);

      if (!obsUsingImage || obsUsingImage.length === 0) {
        await deleteSceneSnapshot(this.client, itemToDelete.image_reference);
      }
    }

    const { error } = await this.client.from("items").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete item from Supabase:", error);
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }

  async getObservations(): Promise<ItemObservation[]> {
    const { data, error } = await this.client
      .from("observations")
      .select("*")
      .is("deleted_at", null)
      .order("observed_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch observations from Supabase:", error);
      throw new Error(`Failed to load observations: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      item_name: row.item_name,
      item_category: row.item_category ?? undefined,
      location_description: row.location_description,
      landmarks: row.landmarks || [],
      description: row.description,
      confidence: row.confidence,
      observed_at: row.observed_at,
      source: row.source,
      image_reference: row.image_reference ?? undefined,
      coordinates: (row.coordinates as unknown as GeoLocationCoordinates) ?? undefined,
      user_confirmed: row.user_confirmed,
      created_at: row.created_at,
      deleted_at: row.deleted_at ?? undefined,
    }));
  }

  async saveObservation(obs: ItemObservation): Promise<ItemObservation> {
    const validated = ItemObservationInputSchema.parse(obs);
    const obsId = ensureUUID(obs.id);

    // If base64 data URL, upload to private Supabase Storage and store only the path
    let finalImageRef: string | null = validated.image_reference ?? null;
    if (finalImageRef && finalImageRef.startsWith("data:")) {
      try {
        finalImageRef = await uploadSceneSnapshot(this.client, this.userId, obsId, finalImageRef);
      } catch (uploadErr) {
        console.error("Could not upload observation image to storage:", uploadErr);
        throw new Error(`Storage Error: ${(uploadErr as Error)?.message || "Failed to upload snapshot"}`);
      }
    }

    const row = {
      id: obsId,
      user_id: this.userId,
      item_name: validated.item_name,
      item_category: validated.item_category ?? null,
      location_description: validated.location_description,
      landmarks: validated.landmarks,
      description: validated.description,
      confidence: validated.confidence,
      observed_at: validated.observed_at || new Date().toISOString(),
      source: validated.source,
      image_reference: finalImageRef,
      coordinates: validated.coordinates ? JSON.parse(JSON.stringify(validated.coordinates)) : null,
      user_confirmed: validated.user_confirmed,
    };

    const { data, error } = await this.client
      .from("observations")
      .upsert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to save observation in Supabase:", error);
      throw new Error(`Failed to save observation: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      item_name: data.item_name,
      item_category: data.item_category ?? undefined,
      location_description: data.location_description,
      landmarks: data.landmarks || [],
      description: data.description,
      confidence: data.confidence,
      observed_at: data.observed_at,
      source: data.source,
      image_reference: data.image_reference ?? undefined,
      coordinates: (data.coordinates as unknown as GeoLocationCoordinates) ?? undefined,
      user_confirmed: data.user_confirmed,
      created_at: data.created_at,
      deleted_at: data.deleted_at ?? undefined,
    };
  }

  async deleteObservation(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) return;
    const { data: obsToDelete } = await this.client
      .from("observations")
      .select("image_reference")
      .eq("id", id)
      .maybeSingle();

    if (obsToDelete?.image_reference) {
      // Check if any active item or other active observation references this image before removing from storage
      const { data: itemUsingImage } = await this.client
        .from("items")
        .select("id")
        .eq("image_reference", obsToDelete.image_reference)
        .limit(1);

      const { data: otherObsUsingImage } = await this.client
        .from("observations")
        .select("id")
        .eq("image_reference", obsToDelete.image_reference)
        .neq("id", id)
        .is("deleted_at", null)
        .limit(1);

      if ((!itemUsingImage || itemUsingImage.length === 0) && (!otherObsUsingImage || otherObsUsingImage.length === 0)) {
        await deleteSceneSnapshot(this.client, obsToDelete.image_reference);
      }
    }

    const { error } = await this.client
      .from("observations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Failed to delete observation from Supabase:", error);
      throw new Error(`Failed to delete observation: ${error.message}`);
    }
  }

  async getPeople(): Promise<PersonMemory[]> {
    const { data, error } = await this.client
      .from("people_memories")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch people memories from Supabase:", error);
      throw new Error(`Failed to load people memories: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      display_name: row.display_name,
      context_or_relationship: row.context_or_relationship ?? undefined,
      notes: row.notes,
      met_at: row.met_at ?? undefined,
      met_on: row.met_on ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_confirmed: row.user_confirmed,
    }));
  }

  async savePerson(person: PersonMemory): Promise<PersonMemory> {
    const validated = PersonMemoryInputSchema.parse(person);
    const personId = ensureUUID(person.id);

    const row = {
      id: personId,
      user_id: this.userId,
      display_name: validated.display_name,
      context_or_relationship: validated.context_or_relationship ?? null,
      notes: validated.notes,
      met_at: validated.met_at ?? null,
      met_on: validated.met_on ?? null,
      user_confirmed: validated.user_confirmed,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from("people_memories")
      .upsert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to save person memory in Supabase:", error);
      throw new Error(`Failed to save person memory: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      display_name: data.display_name,
      context_or_relationship: data.context_or_relationship ?? undefined,
      notes: data.notes,
      met_at: data.met_at ?? undefined,
      met_on: data.met_on ?? undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_confirmed: data.user_confirmed,
    };
  }

  async updatePerson(id: string, updates: Partial<PersonMemory>): Promise<PersonMemory> {
    if (!UUID_REGEX.test(id)) {
      throw new Error(`Invalid person ID: "${id}". Must be a valid UUID.`);
    }

    const payload: Database["public"]["Tables"]["people_memories"]["Update"] = {
      updated_at: new Date().toISOString(),
    };

    if (updates.display_name !== undefined) payload.display_name = updates.display_name.trim();
    if (updates.context_or_relationship !== undefined) {
      payload.context_or_relationship = updates.context_or_relationship;
    }
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.met_at !== undefined) payload.met_at = updates.met_at;
    if (updates.met_on !== undefined) payload.met_on = updates.met_on;
    if (updates.user_confirmed !== undefined) payload.user_confirmed = updates.user_confirmed;

    const { data, error } = await this.client
      .from("people_memories")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update person memory in Supabase:", error);
      throw new Error(`Failed to update person memory: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      display_name: data.display_name,
      context_or_relationship: data.context_or_relationship ?? undefined,
      notes: data.notes,
      met_at: data.met_at ?? undefined,
      met_on: data.met_on ?? undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_confirmed: data.user_confirmed,
    };
  }

  async deletePerson(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) return;
    const { error } = await this.client.from("people_memories").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete person memory from Supabase:", error);
      throw new Error(`Failed to delete person memory: ${error.message}`);
    }
  }

  async importDemoData(data: {
    items: TrackedItem[];
    observations: ItemObservation[];
    people: PersonMemory[];
  }): Promise<ImportResult> {
    const existingItems = await this.getItems();
    const existingPeople = await this.getPeople();

    const existingItemNames = new Set(existingItems.map((i) => i.item_name.toLowerCase().trim()));
    const existingPersonNames = new Set(existingPeople.map((p) => p.display_name.toLowerCase().trim()));

    let importedItems = 0;
    let skippedItems = 0;
    let importedObservations = 0;
    let importedPeople = 0;
    let skippedPeople = 0;

    const obsIdMap = new Map<string, string>();

    // 1. Import observations first
    for (const obs of data.observations) {
      const newObsId = ensureUUID();
      obsIdMap.set(obs.id, newObsId);

      try {
        await this.saveObservation({
          ...obs,
          id: newObsId,
          user_id: this.userId,
        });
        importedObservations++;
      } catch (err) {
        console.warn("Failed to migrate demo observation:", obs.item_name, err);
      }
    }

    // 2. Import items with duplicate check
    for (const item of data.items) {
      if (existingItemNames.has(item.item_name.toLowerCase().trim())) {
        skippedItems++;
        continue;
      }

      const newItemId = ensureUUID();
      const mappedObsId = item.last_observation_id ? obsIdMap.get(item.last_observation_id) : undefined;

      try {
        await this.saveItem({
          ...item,
          id: newItemId,
          user_id: this.userId,
          last_observation_id: mappedObsId,
        });
        existingItemNames.add(item.item_name.toLowerCase().trim());
        importedItems++;
      } catch (err) {
        console.warn("Failed to migrate demo item:", item.item_name, err);
      }
    }

    // 3. Import people with duplicate check
    for (const person of data.people) {
      if (existingPersonNames.has(person.display_name.toLowerCase().trim())) {
        skippedPeople++;
        continue;
      }

      const newPersonId = ensureUUID();
      try {
        await this.savePerson({
          ...person,
          id: newPersonId,
          user_id: this.userId,
        });
        existingPersonNames.add(person.display_name.toLowerCase().trim());
        importedPeople++;
      } catch (err) {
        console.warn("Failed to migrate demo person:", person.display_name, err);
      }
    }

    return {
      importedItems,
      importedObservations,
      importedPeople,
      skippedItems,
      skippedPeople,
    };
  }

  async resetAll(): Promise<void> {
    await this.client.from("items").delete().eq("user_id", this.userId);
    await this.client.from("observations").delete().eq("user_id", this.userId);
    await this.client.from("people_memories").delete().eq("user_id", this.userId);
  }
}
