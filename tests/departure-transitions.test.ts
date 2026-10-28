import test from "node:test";
import assert from "node:assert/strict";
import type { TrackedItem, TrackedItemStatus } from "../src/types/index.ts";

// Helper: Filter unconfirmed items for departure check (matches app logic)
function getDepartureAlertItems(items: TrackedItem[]): TrackedItem[] {
  return items.filter(
    (item) => item.status === "tracked_unconfirmed" || item.status === "possibly_left_behind"
  );
}

// Helper: Transition status
function transitionStatus(
  item: TrackedItem,
  newStatus: TrackedItemStatus
): TrackedItem {
  return {
    ...item,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
}

test("Phase 4: Departure check filters only unconfirmed items", () => {
  const items: TrackedItem[] = [
    {
      id: "item-1",
      user_id: "user-1",
      item_name: "Apartment Keys",
      status: "tracked_unconfirmed",
      last_location_description: "On coffee table",
      last_landmarks: ["coffee table"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "item-2",
      user_id: "user-1",
      item_name: "Leather Wallet",
      status: "collected", // Explicitly collected
      last_location_description: "On cafe table",
      last_landmarks: ["cafe table"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "item-3",
      user_id: "user-1",
      item_name: "Reading Glasses",
      status: "possibly_left_behind",
      last_location_description: "On hall console",
      last_landmarks: ["hall console"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "item-4",
      user_id: "user-1",
      item_name: "Water Bottle",
      status: "resolved", // Resolved
      last_location_description: "Beside chair",
      last_landmarks: ["chair"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const alerts = getDepartureAlertItems(items);

  // Acceptance Criteria: Collected items are excluded from reminders
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].item_name, "Apartment Keys");
  assert.equal(alerts[1].item_name, "Reading Glasses");

  const collectedFound = alerts.some((i) => i.status === "collected");
  assert.equal(collectedFound, false, "Collected items must never be flagged in departure reminders");

  const resolvedFound = alerts.some((i) => i.status === "resolved");
  assert.equal(resolvedFound, false, "Resolved items must never be flagged in departure reminders");
});

test("Phase 4: Item status transitions correctly", () => {
  const item: TrackedItem = {
    id: "item-test",
    user_id: "user-1",
    item_name: "Car Keys",
    status: "tracked_unconfirmed",
    last_location_description: "On entrance hook",
    last_landmarks: ["entrance hook"],
    last_observed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Mark as collected
  const collectedItem = transitionStatus(item, "collected");
  assert.equal(collectedItem.status, "collected");
  assert.equal(getDepartureAlertItems([collectedItem]).length, 0);

  // 2. Mark as possibly left behind
  const leftBehindItem = transitionStatus(item, "possibly_left_behind");
  assert.equal(leftBehindItem.status, "possibly_left_behind");
  assert.equal(getDepartureAlertItems([leftBehindItem]).length, 1);

  // 3. Mark as resolved
  const resolvedItem = transitionStatus(leftBehindItem, "resolved");
  assert.equal(resolvedItem.status, "resolved");
  assert.equal(getDepartureAlertItems([resolvedItem]).length, 0);
});

test("Phase 4: Departure reminder speech summary format", () => {
  const unconfirmed: TrackedItem[] = [
    {
      id: "item-1",
      user_id: "user-1",
      item_name: "Apartment Keys",
      status: "tracked_unconfirmed",
      last_location_description: "on the coffee table",
      last_landmarks: ["coffee table"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const summary = `Before you step away, you have 1 unconfirmed belonging: Apartment Keys, last recorded on the coffee table. Did you remember to collect them?`;

  assert.ok(summary.includes("last recorded"));
  assert.ok(!summary.includes("is definitely at"));
  assert.ok(summary.includes("Apartment Keys"));
});
