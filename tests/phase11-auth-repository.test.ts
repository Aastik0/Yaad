import test from "node:test";
import assert from "node:assert/strict";
import {
  AuthCredentialsSchema,
  TrackedItemInputSchema,
  ItemObservationInputSchema,
  PersonMemoryInputSchema,
} from "../src/lib/schemas.ts";
import { LocalStorageRepository } from "../src/lib/repository/localStorageRepository.ts";
import { getStorageRepository } from "../src/lib/repository/index.ts";
import type { TrackedItem, PersonMemory } from "../src/types/index.ts";

test("Phase 11 Auth: Validates email and minimum password length", () => {
  const valid = AuthCredentialsSchema.safeParse({
    email: "user@example.com",
    password: "secretpassword123",
  });
  assert.equal(valid.success, true);

  const invalidEmail = AuthCredentialsSchema.safeParse({
    email: "not-an-email",
    password: "secretpassword123",
  });
  assert.equal(invalidEmail.success, false);

  const shortPassword = AuthCredentialsSchema.safeParse({
    email: "user@example.com",
    password: "123",
  });
  assert.equal(shortPassword.success, false);
});

test("Phase 11 Schema: Validates TrackedItemInput schema constraints", () => {
  const validItem = {
    item_name: "Prescription Glasses",
    category: "Eyewear",
    status: "tracked_unconfirmed",
    last_location_description: "On the nightstand beside the lamp",
    last_landmarks: ["nightstand", "lamp"],
    geofence_radius_meters: 50,
  };
  const parsed = TrackedItemInputSchema.safeParse(validItem);
  assert.equal(parsed.success, true);

  const invalidItem = {
    item_name: "", // empty name
    last_location_description: "",
  };
  const invalidParsed = TrackedItemInputSchema.safeParse(invalidItem);
  assert.equal(invalidParsed.success, false);
});

test("Phase 11 Schema: Validates ItemObservation and PersonMemory schemas", () => {
  const validObs = {
    item_name: "Keys",
    location_description: "On coffee table",
    landmarks: ["table"],
    description: "Brass carabiner keys on table",
    confidence: "high",
    source: "browser_upload",
  };
  assert.equal(ItemObservationInputSchema.safeParse(validObs).success, true);

  const validPerson = {
    display_name: "Dr. Alistair Finch",
    context_or_relationship: "Neurologist",
    notes: "Follow-up checkup every 6 months at Memory Care Clinic",
  };
  assert.equal(PersonMemoryInputSchema.safeParse(validPerson).success, true);
});

test("Phase 11 Repository: LocalStorageRepository operates correctly in demo mode", async () => {
  const repo = new LocalStorageRepository();
  assert.equal(repo.isCloud, false);

  const items = await repo.getItems();
  assert.equal(Array.isArray(items), true);

  const testItem: TrackedItem = {
    id: "test-repo-item-1",
    user_id: "demo-user",
    item_name: "Car Keys",
    category: "Keys",
    status: "tracked_unconfirmed",
    last_location_description: "On the key hook by front door",
    last_landmarks: ["key hook"],
    last_observed_at: new Date().toISOString(),
    geofence_radius_meters: 50,
    updated_at: new Date().toISOString(),
  };

  await repo.saveItem(testItem);
  const updated = await repo.updateItem("test-repo-item-1", { status: "collected" });
  assert.equal(updated.status, "collected");

  await repo.deleteItem("test-repo-item-1");
  const afterDelete = await repo.getItems();
  assert.equal(afterDelete.some((i) => i.id === "test-repo-item-1"), false);
});

test("Phase 11 Repository: getStorageRepository selects LocalStorage when unauthenticated", () => {
  const repo = getStorageRepository(null);
  assert.equal(repo.isCloud, false);
});
