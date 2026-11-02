import type { VisionProvider } from "./types.ts";
import { MockVisionProvider } from "./MockVisionProvider.ts";
import { MetaMuseVisionProvider } from "./MetaMuseVisionProvider.ts";
import { VisionProviderState, type VisionProviderType } from "./providerState.ts";

export interface ProviderSelectionContext {
  isDemoMode?: boolean;
  forceLive?: boolean;
  userId?: string;
  requestedProvider?: VisionProviderType;
}

/**
 * getVisionProvider
 * Selects the appropriate vision grounding provider based on application mode,
 * user selection, feature flags, kill switches, authentication, and configured credentials.
 *
 * Guarantees:
 * - Demo Mode ALWAYS selects MockVisionProvider (zero external calls) unless explicitly enabled by user selection.
 * - Defaults to MockVisionProvider across all fallback conditions.
 * - If META_REQUESTS_KILL_SWITCH=true, immediately falls back to MockVisionProvider.
 * - Unauthenticated users (demo-user) default to MockVisionProvider.
 * - Client cannot force Meta Muse unless all server gates are satisfied.
 */
export function getVisionProvider(context?: ProviderSelectionContext): VisionProvider {
  // If forceLive is requested (e.g. in unit tests directly testing provider error handling),
  // instantiate MetaMuseVisionProvider so it can exercise its internal guardrails.
  if (context?.forceLive) {
    return new MetaMuseVisionProvider();
  }

  // If explicitly requested mock, always return MockVisionProvider
  if (context?.requestedProvider === "mock") {
    return new MockVisionProvider();
  }

  const providerState = VisionProviderState.getInstance();
  const serverActiveProvider = providerState.getActiveProvider(context?.userId);

  const isDemoEnv = process.env.NEXT_PUBLIC_APP_MODE === "demo";
  const isExplicitDemo = context?.isDemoMode === true;

  // In demo environment, live is only used if explicitly selected (client requestedProvider or server state)
  const userRequestedLive =
    context?.requestedProvider === "meta_muse" || serverActiveProvider === "meta_muse";

  if (isExplicitDemo || (isDemoEnv && !userRequestedLive)) {
    return new MockVisionProvider();
  }

  // Evaluate gates
  const liveApiEnabled =
    process.env.ENABLE_LIVE_META_API === "true" ||
    process.env.ENABLE_LIVE_META_API === "1";

  const killSwitchActive =
    process.env.META_REQUESTS_KILL_SWITCH === "true" ||
    process.env.META_REQUESTS_KILL_SWITCH === "1";

  const hasApiKey = Boolean(process.env.MODEL_API_KEY || process.env.META_API_KEY);
  const isAuthenticatedUser =
    (context?.userId && context.userId !== "demo-user") ||
    providerState.getEligibility(context?.userId).gates.userAuthenticated;

  if (!liveApiEnabled || killSwitchActive || !hasApiKey || !isAuthenticatedUser) {
    return new MockVisionProvider();
  }

  return new MetaMuseVisionProvider();
}
