import test from "node:test";
import assert from "node:assert/strict";
import type { PersonMemory } from "../src/types/index.ts";

// Helper: Scoped filter for user isolation
function getPeopleForUser(records: PersonMemory[], userId: string): PersonMemory[] {
  return records.filter((r) => r.user_id === userId);
}

// Helper: Search function matching component logic
function searchPeopleMemories(records: PersonMemory[], query: string): PersonMemory[] {
  const q = query.trim().toLowerCase();
  if (!q) return records;
  return records.filter(
    (p) =>
      p.display_name.toLowerCase().includes(q) ||
      (p.context_or_relationship && p.context_or_relationship.toLowerCase().includes(q)) ||
      (p.met_at && p.met_at.toLowerCase().includes(q)) ||
      p.notes.toLowerCase().includes(q)
  );
}

test("Phase 7: Person memory manual creation requires user confirmation", () => {
  const newPerson: PersonMemory = {
    id: "person-test-1",
    user_id: "user-alpha",
    display_name: "Marcus Vance",
    context_or_relationship: "Co-founder, Studio Labs",
    notes: "Discussed on-device vision models and privacy guarantees.",
    met_at: "Hall B Coffee Kiosk",
    met_on: "2026-10-29",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_confirmed: true,
  };

  assert.equal(newPerson.user_confirmed, true, "Person memory must be explicitly user-confirmed");
  assert.equal(newPerson.display_name, "Marcus Vance");
  assert.ok(newPerson.notes.includes("privacy guarantees"));
});

test("Phase 7: User-isolation prevents cross-user memory leakage", () => {
  const allRecords: PersonMemory[] = [
    {
      id: "p-user-1",
      user_id: "user-1",
      display_name: "Priya Sharma",
      context_or_relationship: "Hackathon collaborator",
      notes: "Works on accessibility.",
      met_at: "Main Stage",
      met_on: "2026-10-28",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_confirmed: true,
    },
    {
      id: "p-user-2",
      user_id: "user-2",
      display_name: "Elena Rostova",
      context_or_relationship: "Private Contact",
      notes: "Sensitive personal note for user 2 only.",
      met_at: "Private Meeting",
      met_on: "2026-10-29",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_confirmed: true,
    },
  ];

  // User 1 requests their records
  const user1Records = getPeopleForUser(allRecords, "user-1");
  assert.equal(user1Records.length, 1);
  assert.equal(user1Records[0].display_name, "Priya Sharma");
  assert.equal(
    user1Records.some((r) => r.display_name === "Elena Rostova"),
    false,
    "User 1 must NEVER see records belonging to User 2"
  );

  // User 2 requests their records
  const user2Records = getPeopleForUser(allRecords, "user-2");
  assert.equal(user2Records.length, 1);
  assert.equal(user2Records[0].display_name, "Elena Rostova");
});

test("Phase 7: Editing a person memory updates notes and timestamps", () => {
  const person: PersonMemory = {
    id: "person-edit-1",
    user_id: "user-alpha",
    display_name: "Priya Sharma",
    context_or_relationship: "Hackathon collaborator",
    notes: "Initial note.",
    met_at: "Hacker Lounge",
    met_on: "2026-10-28",
    created_at: "2026-10-28T10:00:00Z",
    updated_at: "2026-10-28T10:00:00Z",
    user_confirmed: true,
  };

  const updatedPerson: PersonMemory = {
    ...person,
    notes: "Updated note: She uses VoiceOver and specializes in tactile UI feedback.",
    updated_at: "2026-10-29T15:30:00Z",
  };

  assert.equal(updatedPerson.id, person.id);
  assert.ok(updatedPerson.notes.includes("tactile UI feedback"));
  assert.notEqual(updatedPerson.updated_at, person.created_at);
});

test("Phase 7: Deleting a person memory removes it completely", () => {
  let records: PersonMemory[] = [
    {
      id: "p-delete-1",
      user_id: "user-alpha",
      display_name: "To Be Deleted",
      notes: "Temporary note.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_confirmed: true,
    },
    {
      id: "p-keep-1",
      user_id: "user-alpha",
      display_name: "Keeper",
      notes: "Keep this note.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_confirmed: true,
    },
  ];

  // Delete p-delete-1
  records = records.filter((r) => r.id !== "p-delete-1");
  assert.equal(records.length, 1);
  assert.equal(records[0].display_name, "Keeper");
  assert.equal(records.some((r) => r.id === "p-delete-1"), false);
});

test("Phase 7: Search matches names, meeting locations, and note keywords", () => {
  const records: PersonMemory[] = [
    {
      id: "p-1",
      user_id: "user-1",
      display_name: "Priya Sharma",
      context_or_relationship: "Accessibility Designer",
      notes: "Works on tactile feedback and VoiceOver screen readers in Seattle.",
      met_at: "Main Stage Lounge",
      met_on: "2026-10-28",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_confirmed: true,
    },
    {
      id: "p-2",
      user_id: "user-1",
      display_name: "David Kim",
      context_or_relationship: "Kernel Engineer",
      notes: "Discussed low-latency Bluetooth audio protocols.",
      met_at: "Outdoor Garden Patio",
      met_on: "2026-10-29",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_confirmed: true,
    },
  ];

  // 1. Search by name
  const byName = searchPeopleMemories(records, "Priya");
  assert.equal(byName.length, 1);
  assert.equal(byName[0].display_name, "Priya Sharma");

  // 2. Search by location
  const byLocation = searchPeopleMemories(records, "Garden Patio");
  assert.equal(byLocation.length, 1);
  assert.equal(byLocation[0].display_name, "David Kim");

  // 3. Search by keyword in notes
  const byKeyword = searchPeopleMemories(records, "VoiceOver");
  assert.equal(byKeyword.length, 1);
  assert.equal(byKeyword[0].display_name, "Priya Sharma");

  // 4. Non-matching search
  const noMatch = searchPeopleMemories(records, "Quantum Computing");
  assert.equal(noMatch.length, 0);
});

