import { CandidateItem } from "@/types";

/**
 * Realistic Mock Vision Provider for Yaad Demo Mode
 * Simulates grounded scene understanding with zero external network requests.
 */

interface MockAnalysisInput {
  imageName?: string;
  requestedQuery?: string;
  source?: "browser_upload" | "browser_camera" | "manual";
}

export async function analyzeSceneWithMock(
  input: MockAnalysisInput
): Promise<CandidateItem[]> {
  // Simulate natural vision model latency (600-900ms)
  await new Promise((resolve) => setTimeout(resolve, 750));

  const query = (input.requestedQuery || "").toLowerCase();

  // Dynamic realistic candidate generation based on user query
  const candidates: CandidateItem[] = [];

  const wantsKeys = !query || query.includes("key");
  const wantsWallet = !query || query.includes("wallet") || query.includes("card");
  const wantsGlasses = !query || query.includes("glass") || query.includes("spectacle");
  const wantsBottle = query.includes("bottle") || query.includes("drink") || query.includes("water");
  const wantsBag = query.includes("bag") || query.includes("backpack") || query.includes("tote");

  if (wantsKeys) {
    candidates.push({
      id: `cand-${Date.now()}-1`,
      item_name: "Apartment Keys with Brass Carabiner",
      category: "Keys",
      location_description: "Resting flat on the wooden coffee table near the ceramic coffee mug",
      landmarks: ["wooden coffee table", "ceramic coffee mug", "open notebook"],
      description: "Brass carabiner keychain recorded lying flat on the oak table surface.",
      confidence: "high",
      is_selected: true,
    });
  }

  if (wantsWallet) {
    candidates.push({
      id: `cand-${Date.now()}-2`,
      item_name: "Brown Leather Cardholder Wallet",
      category: "Personal",
      location_description: "On the café round bistro table next to the laptop charger",
      landmarks: ["round bistro table", "laptop charger", "water glass"],
      description: "Folded leather wallet recorded on the small cafe table next to an uncoiled USB-C power block.",
      confidence: "high",
      is_selected: true,
    });
  }

  if (wantsGlasses) {
    candidates.push({
      id: `cand-${Date.now()}-3`,
      item_name: "Prescription Reading Glasses",
      category: "Eyewear",
      location_description: "Left on the hall console table near the front door key dish",
      landmarks: ["hall console table", "ceramic key dish", "mail stack"],
      description: "Tortoiseshell frame glasses resting folded in front of the empty ceramic mail tray.",
      confidence: "high",
      is_selected: true,
    });
  }

  if (wantsBottle) {
    candidates.push({
      id: `cand-${Date.now()}-4`,
      item_name: "Matte Black Water Bottle",
      category: "Beverage",
      location_description: "Beside the backpack on the side chair",
      landmarks: ["side chair", "green canvas backpack"],
      description: "Insulated bottle standing upright next to the shoulder strap of the bag.",
      confidence: "medium",
      is_selected: true,
    });
  }

  if (wantsBag) {
    candidates.push({
      id: `cand-${Date.now()}-5`,
      item_name: "Canvas Messenger Bag",
      category: "Bag",
      location_description: "Draped over the back of the dining chair",
      landmarks: ["dining chair", "coat hook"],
      description: "Olive canvas messenger bag hanging by its strap over the wooden chair back.",
      confidence: "medium",
      is_selected: true,
    });
  }

  // Fallback candidate if query matched nothing specific
  if (candidates.length === 0) {
    const rawName = input.requestedQuery?.trim() || "Unspecified Belonging";
    candidates.push({
      id: `cand-${Date.now()}-custom`,
      item_name: rawName,
      category: "Belonging",
      location_description: "Observed resting on the primary workspace surface",
      landmarks: ["workspace desk", "monitor stand"],
      description: `Target item '${rawName}' detected on the surface with moderate visual clarity.`,
      confidence: "medium",
      is_selected: true,
    });
  }

  return candidates;
}

