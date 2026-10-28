import { ItemObservation, TrackedItem, PersonMemory } from "@/types";

export const DEMO_USER_ID = "demo-user-yaad-01";

export const INITIAL_TRACKED_ITEMS: TrackedItem[] = [
  {
    id: "item-01",
    user_id: DEMO_USER_ID,
    item_name: "Apartment Keys with Brass Carabiner",
    category: "Keys",
    status: "tracked_unconfirmed",
    last_observation_id: "obs-01",
    last_location_description: "On the wooden coffee table near the ceramic coffee mug",
    last_landmarks: ["wooden coffee table", "ceramic coffee mug", "open notebook"],
    last_observed_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(), // 42 mins ago
    updated_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: "item-02",
    user_id: DEMO_USER_ID,
    item_name: "Brown Leather Cardholder Wallet",
    category: "Personal",
    status: "tracked_unconfirmed",
    last_observation_id: "obs-02",
    last_location_description: "On the café round bistro table next to the laptop charger",
    last_landmarks: ["round bistro table", "laptop charger", "water glass"],
    last_observed_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
    updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "item-03",
    user_id: DEMO_USER_ID,
    item_name: "Matte Black Water Bottle",
    category: "Beverage",
    status: "collected",
    last_observation_id: "obs-03",
    last_location_description: "Beside the backpack on the side chair",
    last_landmarks: ["side chair", "green canvas backpack"],
    last_observed_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(), // 95 mins ago
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "item-04",
    user_id: DEMO_USER_ID,
    item_name: "Prescription Reading Glasses",
    category: "Eyewear",
    status: "possibly_left_behind",
    last_observation_id: "obs-04",
    last_location_description: "Left on the hall console table near the front door key dish",
    last_landmarks: ["hall console table", "ceramic key dish", "mail stack"],
    last_observed_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(), // 3 hours ago
    updated_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_OBSERVATIONS: ItemObservation[] = [
  {
    id: "obs-01",
    user_id: DEMO_USER_ID,
    item_name: "Apartment Keys with Brass Carabiner",
    item_category: "Keys",
    location_description: "On the wooden coffee table near the ceramic coffee mug",
    landmarks: ["wooden coffee table", "ceramic coffee mug", "open notebook"],
    description: "Brass carabiner keychain recorded lying flat on oak surface beside a white ceramic mug.",
    confidence: "high",
    observed_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    source: "browser_camera",
    user_confirmed: true,
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: "obs-02",
    user_id: DEMO_USER_ID,
    item_name: "Brown Leather Cardholder Wallet",
    item_category: "Personal",
    location_description: "On the café round bistro table next to the laptop charger",
    landmarks: ["round bistro table", "laptop charger", "water glass"],
    description: "Folded leather wallet recorded on the small cafe table next to an uncoiled USB-C power block.",
    confidence: "high",
    observed_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    source: "browser_upload",
    user_confirmed: true,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "obs-03",
    user_id: DEMO_USER_ID,
    item_name: "Matte Black Water Bottle",
    item_category: "Beverage",
    location_description: "Beside the backpack on the side chair",
    landmarks: ["side chair", "green canvas backpack"],
    description: "Insulated bottle standing upright next to the shoulder strap of the bag.",
    confidence: "medium",
    observed_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    source: "browser_upload",
    user_confirmed: true,
    created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    id: "obs-04",
    user_id: DEMO_USER_ID,
    item_name: "Prescription Reading Glasses",
    item_category: "Eyewear",
    location_description: "Left on the hall console table near the front door key dish",
    landmarks: ["hall console table", "ceramic key dish", "mail stack"],
    description: "Tortoiseshell frame glasses resting folded in front of the empty ceramic mail tray.",
    confidence: "high",
    observed_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    source: "browser_upload",
    user_confirmed: true,
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_PEOPLE_MEMORIES: PersonMemory[] = [
  {
    id: "person-01",
    user_id: DEMO_USER_ID,
    display_name: "Priya Sharma",
    context_or_relationship: "Meta AI Hackathon Collaborator",
    notes: "Works on digital accessibility and tactile UI feedback. Mentioned she lives in Seattle and uses VoiceOver daily.",
    met_at: "Main Stage Hacker Lounge",
    met_on: "2026-10-28",
    created_at: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    user_confirmed: true,
  },
];

