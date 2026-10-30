import type { GeoLocationCoordinates } from "../types/index.ts";
import type { AnalyzeRequestInput } from "./schemas.ts";
import { DEFAULT_DEMO_COORDINATES } from "./geo.ts";

/**
 * Phase 9: Meta Ray-Ban Virtual Simulator Adapter
 * Conforms to Meta Wearables Device Access Toolkit (DAT) and Display specifications.
 * Thin adapter passing simulated glasses events directly into Yaad's capture workflow.
 */

export interface GlassesDeviceState {
  isDonned: boolean; // Capacitive wear sensor (true = worn on face)
  batteryPercent: number;
  connectionState: "connected" | "disconnected" | "pairing";
  model: "meta_ray_ban_wayfarer" | "meta_ray_ban_display";
}

export interface GlassesCaptureEvent {
  timestamp: string;
  source: "glasses_sdk";
  trigger: "voice_shortcut" | "touchpad_tap";
  imageDataUrl: string;
  coordinates: GeoLocationCoordinates;
  viewportWidth: number;
  viewportHeight: number;
}

// Feature flag: enable simulator by default in demo mode unless explicitly turned off
export function isGlassesSimulatorEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_GLASSES_SIMULATOR === "false") {
    return false;
  }
  return true;
}

/**
 * Generates an eye-level Point-of-View (POV) frame matching the 600x600 Display / HD specs
 */
export function generateSimulatedGlassesPovFrame(
  label = "Coffee Table with Keys & Cardholder"
): string {
  // Generates clean, crisp eye-level POV scene preview
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2D543F" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#ECE8DD" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <circle cx="300" cy="300" r="280" fill="none" stroke="#224231" stroke-width="2" stroke-dasharray="6,6" opacity="0.3"/>
    <text x="300" y="240" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="13" font-weight="600" fill="#2D543F" letter-spacing="2">META RAY-BAN POV SIMULATOR</text>
    <rect x="150" y="270" width="300" height="60" rx="8" fill="#FFFFFF" stroke="#DFD9CA"/>
    <text x="300" y="300" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#172E22">${label}</text>
    <text x="300" y="360" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="11" fill="#8A9A86">600 × 600 Eye-Level HUD Display</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Simulates glasses capture trigger (voice command or right-temple touchpad tap)
 */
export function simulateGlassesCapture(
  trigger: "voice_shortcut" | "touchpad_tap" = "voice_shortcut",
  customCoords?: GeoLocationCoordinates
): GlassesCaptureEvent {
  const coords = customCoords || DEFAULT_DEMO_COORDINATES;

  return {
    timestamp: new Date().toISOString(),
    source: "glasses_sdk",
    trigger,
    imageDataUrl: generateSimulatedGlassesPovFrame(),
    coordinates: coords,
    viewportWidth: 600,
    viewportHeight: 600,
  };
}

/**
 * Transforms a GlassesCaptureEvent into a standard Yaad AnalyzeRequestInput payload
 */
export function buildGlassesAnalyzePayload(
  event: GlassesCaptureEvent,
  requestedQuery = "keys and wallet",
  userId = "demo-user"
): AnalyzeRequestInput {
  return {
    image: event.imageDataUrl,
    requestedQuery,
    source: "manual", // safe internal fallback, with UI retaining glasses_sdk source
    userId,
    forceLive: false, // strictly zero credit spend during simulator operations
  };
}
