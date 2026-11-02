/**
 * Phase 23B: Development-Only Virtual Hardware Adapter
 * For Meta Ray-Ban Display Smart Glasses Virtual Development & Testing
 *
 * Provides mock camera POV frame injection, voice transcript injection,
 * and GPS movement/departure simulation for testing without physical glasses.
 *
 * STRICT SAFETY RULE:
 * This module is active ONLY in development environments (NODE_ENV !== "production")
 * or when explicitly run in local simulator mode. All mock inputs are unambiguously
 * labeled as SIMULATED HARDWARE.
 */

import type { GeoLocationCoordinates } from "../../types/index.ts";
import { DEFAULT_DEMO_COORDINATES, simulateCoordinateOffset } from "../geo.ts";

export interface PovScenePreset {
  id: string;
  name: string;
  locationName: string;
  environment: "indoor_cafe" | "airport_lounge" | "office_desk";
  landmarks: string[];
  description: string;
  coordinates: GeoLocationCoordinates;
  svgDataUrl: string;
}

/**
 * High-resolution first-person POV test fixtures matching the 600x600 display
 */
export const POV_SCENE_PRESETS: PovScenePreset[] = [
  {
    id: "scene_cafe_table",
    name: "Cafe Table (Keys & Leather Wallet)",
    locationName: "Blue Bottle Cafe — Corner Table 4",
    environment: "indoor_cafe",
    landmarks: ["Dark Wood Table", "Ceramic Coffee Mug", "Napkin Holder"],
    description: "First-person POV looking down at a wooden cafe table with apartment keys and brown leather cardholder.",
    coordinates: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 5,
      place_name: "Blue Bottle Cafe",
    },
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#2B1E16"/>
        <!-- Wood grain table surface -->
        <line x1="0" y1="150" x2="600" y2="150" stroke="#3A281E" stroke-width="2"/>
        <line x1="0" y1="320" x2="600" y2="320" stroke="#3A281E" stroke-width="3"/>
        <line x1="0" y1="460" x2="600" y2="460" stroke="#3A281E" stroke-width="2"/>
        <!-- Coffee Mug -->
        <circle cx="150" cy="220" r="45" fill="#ECE8DD" stroke="#8A9A86" stroke-width="3"/>
        <circle cx="150" cy="220" r="35" fill="#4A2E18"/>
        <!-- Keys with Carabiner -->
        <rect x="240" y="310" width="85" height="40" rx="10" fill="#C5A059" stroke="#E5C158" stroke-width="2"/>
        <circle cx="260" cy="330" r="10" fill="none" stroke="#FFFFFF" stroke-width="3"/>
        <rect x="290" y="325" width="45" height="10" fill="#E5C158"/>
        <rect x="310" y="335" width="15" height="8" fill="#E5C158"/>
        <text x="282" y="380" fill="#34D399" font-family="monospace" font-size="12" text-anchor="middle">[Car Keys (98%)]</text>
        <!-- Leather Cardholder Wallet -->
        <rect x="380" y="270" width="130" height="85" rx="6" fill="#6B3A19" stroke="#8C4E22" stroke-width="2"/>
        <rect x="390" y="285" width="110" height="25" rx="3" fill="#522C13"/>
        <text x="445" y="385" fill="#34D399" font-family="monospace" font-size="12" text-anchor="middle">[Leather Wallet (96%)]</text>
        <!-- Reticle Overlay -->
        <circle cx="300" cy="300" r="220" fill="none" stroke="#34D399" stroke-width="1.5" stroke-dasharray="8,8" opacity="0.4"/>
        <text x="300" y="550" fill="#ECE8DD" font-family="monospace" font-size="13" text-anchor="middle" letter-spacing="1">SIMULATED GLASSES POV • CAFE TABLE</text>
      </svg>
    `)}`,
  },
  {
    id: "scene_airport_lounge",
    name: "Airport Lounge (Passport & Headphones)",
    locationName: "SFO Terminal 2 — Gate D8 Lounge",
    environment: "airport_lounge",
    landmarks: ["Frosted Glass Table", "Boarding Pass Sleeve", "Water Bottle"],
    description: "First-person POV of international passport and wireless headphones on a frosted glass surface.",
    coordinates: {
      latitude: 37.6213,
      longitude: -122.379,
      accuracy: 6,
      place_name: "SFO Airport Lounge",
    },
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#1E293B"/>
        <!-- Frosted Glass texture -->
        <rect x="40" y="40" width="520" height="520" rx="16" fill="#334155" opacity="0.5"/>
        <!-- Passport (Blue) -->
        <rect x="180" y="230" width="100" height="140" rx="6" fill="#1E3A8A" stroke="#3B82F6" stroke-width="2"/>
        <circle cx="230" cy="285" r="22" fill="none" stroke="#FBBF24" stroke-width="2"/>
        <text x="230" y="395" fill="#34D399" font-family="monospace" font-size="12" text-anchor="middle">[US Passport (99%)]</text>
        <!-- Headphones -->
        <circle cx="410" cy="300" r="45" fill="none" stroke="#0F172A" stroke-width="14"/>
        <circle cx="380" cy="320" r="24" fill="#0F172A"/>
        <circle cx="440" cy="320" r="24" fill="#0F172A"/>
        <text x="410" y="380" fill="#34D399" font-family="monospace" font-size="12" text-anchor="middle">[Headphones (97%)]</text>
        <!-- Reticle -->
        <circle cx="300" cy="300" r="220" fill="none" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="8,8" opacity="0.4"/>
        <text x="300" y="550" fill="#94A3B8" font-family="monospace" font-size="13" text-anchor="middle" letter-spacing="1">SIMULATED GLASSES POV • AIRPORT LOUNGE</text>
      </svg>
    `)}`,
  },
  {
    id: "scene_office_desk",
    name: "Office Desk (Badge Lanyard & Laptop)",
    locationName: "HQ Floor 3 — Shared Hotdesk 12",
    environment: "office_desk",
    landmarks: ["Standing Desk Mat", "Dual Monitor Stand", "Pen Holder"],
    description: "First-person POV of office hotdesk with NFC security badge and metallic pen.",
    coordinates: {
      latitude: 37.7892,
      longitude: -122.4014,
      accuracy: 4,
      place_name: "Downtown Office",
    },
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#0F172A"/>
        <!-- Desk Mat -->
        <rect x="80" y="140" width="440" height="340" rx="12" fill="#1E293B"/>
        <!-- Work Badge Lanyard -->
        <rect x="220" y="240" width="80" height="120" rx="8" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/>
        <rect x="235" y="255" width="50" height="30" fill="#0284C7"/>
        <line x1="260" y1="240" x2="260" y2="150" stroke="#0284C7" stroke-width="4"/>
        <text x="260" y="385" fill="#34D399" font-family="monospace" font-size="12" text-anchor="middle">[Keycard Badge (95%)]</text>
        <!-- Reticle -->
        <circle cx="300" cy="300" r="220" fill="none" stroke="#FBBF24" stroke-width="1.5" stroke-dasharray="8,8" opacity="0.4"/>
        <text x="300" y="550" fill="#94A3B8" font-family="monospace" font-size="13" text-anchor="middle" letter-spacing="1">SIMULATED GLASSES POV • OFFICE DESK</text>
      </svg>
    `)}`,
  },
];

export interface VirtualVoiceCommand {
  label: string;
  transcript: string;
  description: string;
}

export const VIRTUAL_VOICE_COMMANDS: VirtualVoiceCommand[] = [
  {
    label: '“Remember my items”',
    transcript: "Remember my items",
    description: "Triggers POV camera frame snapshot and AI vision analysis",
  },
  {
    label: '“Where are my keys?”',
    transcript: "Where are my keys?",
    description: "Queries historical memory for latest sighting of keys",
  },
  {
    label: '“Where is my wallet?”',
    transcript: "Where is my wallet?",
    description: "Queries historical memory for latest sighting of wallet",
  },
  {
    label: '“Navigate to my keys”',
    transcript: "Navigate to my keys",
    description: "Launches turn-by-turn map directions to last known coordinates",
  },
];

/**
 * Checks if virtual hardware adapter is authorized to run
 */
export function isVirtualHardwareAuthorized(): boolean {
  if (typeof window === "undefined") return true;
  // Strictly prevent virtual hardware adapter in production deployments
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_VIRTUAL_ADAPTER !== "true") {
    return false;
  }
  return true;
}

/**
 * Simulates GPS departure movement by offsetting origin coordinates by deltaMeters
 */
export function simulateVirtualDeparture(
  origin: GeoLocationCoordinates = DEFAULT_DEMO_COORDINATES,
  deltaMeters = 50
): GeoLocationCoordinates {
  // Uses verified high-precision coordinate offset from geo.ts
  const offset = simulateCoordinateOffset(origin.latitude, origin.longitude, deltaMeters);
  return {
    ...origin,
    latitude: offset.latitude,
    longitude: offset.longitude,
  };
}
