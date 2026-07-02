// ═══════════════════════════════════════════════════════════════
//  Plans & entitlements — the single source of truth for every
//  product limit. Today everyone is on 'free'; introducing a paid
//  tier later means: 1) flip limits here, 2) add billing that sets
//  profiles.plan, 3) nothing else — the app already reads from this.
// ═══════════════════════════════════════════════════════════════

export const PLANS = {
  free: {
    id: 'free',
    label: 'FlickPick',
    maxPlayers: 12,
    maxDeckSize: 50,
    historyLimit: 60,   // watch-history entries shown on the profile
    roomsLimit: 30,     // hosted rooms shown on the profile
  },
  // Future paid tier — placeholder values, not purchasable yet.
  plus: {
    id: 'plus',
    label: 'FlickPick+',
    maxPlayers: 24,
    maxDeckSize: 100,
    historyLimit: 500,
    roomsLimit: 200,
  },
};

// Resolve a profile row ({ plan: 'free' | 'plus' | null }) to its plan.
export function planFor(profile) {
  return PLANS[profile?.plan] || PLANS.free;
}
