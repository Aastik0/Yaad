/**
/**
 * Realistic Simulated Eye-Level Point-of-View (POV) Scene Snapshots
 * Generated as pure standalone SVG Data URIs for offline, zero-network, zero-latency rendering.
 * Mimics what the Meta Ray-Ban Smart Glasses camera captures at eye level with landmark grounding.
 */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const DUMMY_SCENE_IMAGES = {
  keys: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3E2723"/>
          <stop offset="50%" stop-color="#4E342E"/>
          <stop offset="100%" stop-color="#2D1B18"/>
        </linearGradient>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="50%" stop-color="#D97706"/>
          <stop offset="100%" stop-color="#92400E"/>
        </linearGradient>
        <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#E2E8F0"/>
        </linearGradient>
      </defs>
      <!-- Warm Oak Tabletop -->
      <rect width="600" height="400" fill="url(#wood)"/>
      <line x1="0" y1="120" x2="600" y2="120" stroke="#2D1B18" stroke-width="2" opacity="0.4"/>
      <line x1="0" y1="260" x2="600" y2="260" stroke="#5D4037" stroke-width="2" opacity="0.3"/>

      <!-- Landmark: Open Notebook -->
      <rect x="360" y="70" width="180" height="230" rx="4" fill="#F8FAFC" transform="rotate(8 450 185)"/>
      <rect x="370" y="80" width="160" height="210" rx="2" fill="#FFFFFF" stroke="#E2E8F0" transform="rotate(8 450 185)"/>
      <line x1="390" y1="120" x2="500" y2="135" stroke="#CBD5E1" stroke-width="2"/>
      <line x1="393" y1="145" x2="495" y2="160" stroke="#CBD5E1" stroke-width="2"/>
      <line x1="396" y1="170" x2="480" y2="182" stroke="#CBD5E1" stroke-width="2"/>

      <!-- Landmark: Ceramic Coffee Mug -->
      <ellipse cx="140" cy="180" rx="48" ry="48" fill="#1E293B" opacity="0.3"/>
      <circle cx="135" cy="170" r="44" fill="url(#cup)" stroke="#CBD5E1" stroke-width="3"/>
      <circle cx="135" cy="170" r="36" fill="#3E2723"/>
      <circle cx="135" cy="170" r="33" fill="#2E1C14"/>
      <!-- Mug Handle -->
      <path d="M 88 150 C 65 155, 65 185, 88 190" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>

      <!-- Target Item: Keys with Brass Carabiner -->
      <g transform="translate(230, 190) rotate(-12)">
        <!-- Shadow -->
        <ellipse cx="60" cy="55" rx="55" ry="25" fill="#1E293B" opacity="0.4"/>
        <!-- Carabiner Hook -->
        <path d="M 30 20 C 15 20, 15 65, 30 65 L 75 65 C 90 65, 90 20, 75 20 Z" fill="none" stroke="url(#brass)" stroke-width="9" stroke-linecap="round"/>
        <!-- Carabiner Gate -->
        <line x1="45" y1="20" x2="65" y2="20" stroke="#FBBF24" stroke-width="6"/>
        <!-- Key Ring -->
        <circle cx="85" cy="45" r="14" fill="none" stroke="#E2E8F0" stroke-width="3"/>
        <!-- Brass Key 1 -->
        <rect x="95" y="42" width="60" height="8" rx="2" fill="url(#brass)"/>
        <circle cx="95" cy="46" r="10" fill="url(#brass)"/>
        <rect x="135" y="50" width="6" height="7" fill="url(#brass)"/>
        <rect x="146" y="50" width="6" height="5" fill="url(#brass)"/>
        <!-- Silver Key 2 -->
        <g transform="rotate(25 85 45)">
          <rect x="95" y="42" width="55" height="7" rx="2" fill="#E2E8F0"/>
          <circle cx="95" cy="46" r="9" fill="#E2E8F0"/>
          <rect x="132" y="49" width="5" height="6" fill="#E2E8F0"/>
          <rect x="142" y="49" width="5" height="4" fill="#E2E8F0"/>
        </g>
      </g>

      <!-- Meta Ray-Ban HUD Glasses Viewfinder Overlay -->
      <path d="M 30 50 L 30 30 L 50 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 50 L 570 30 L 550 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 30 350 L 30 370 L 50 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 350 L 570 370 L 550 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>

      <!-- Reticle on Keys -->
      <rect x="220" y="160" width="165" height="110" rx="8" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.9"/>
      <rect x="225" y="145" width="115" height="18" rx="4" fill="#047857"/>
      <text x="282" y="158" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="0.5">APARTMENT KEYS</text>

      <!-- Bottom HUD Label -->
      <rect x="180" y="360" width="240" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="300" y="376" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1">GLASSES POV • COFFEE TABLE</text>
    </svg>
  `),

  wallet: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="marble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#E2E8F0"/>
          <stop offset="50%" stop-color="#F1F5F9"/>
          <stop offset="100%" stop-color="#CBD5E1"/>
        </linearGradient>
        <linearGradient id="leather" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#78350F"/>
          <stop offset="60%" stop-color="#92400E"/>
          <stop offset="100%" stop-color="#5A2408"/>
        </linearGradient>
      </defs>
      <!-- Round Cafe Marble Table -->
      <rect width="600" height="400" fill="url(#marble)"/>
      <path d="M 0 0 C 150 180, 450 120, 600 300" stroke="#94A3B8" stroke-width="2" fill="none" opacity="0.25"/>
      <path d="M 50 350 C 250 200, 380 320, 550 150" stroke="#94A3B8" stroke-width="1.5" fill="none" opacity="0.2"/>

      <!-- Landmark: Laptop Edge & Charger -->
      <rect x="0" y="0" width="220" height="150" rx="6" fill="#475569" opacity="0.95"/>
      <rect x="5" y="5" width="205" height="135" rx="4" fill="#334155"/>
      <!-- Charger Cable winding across table -->
      <path d="M 180 80 C 230 90, 240 180, 210 230 C 190 260, 230 330, 270 340" fill="none" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>
      <rect x="260" y="325" width="30" height="20" rx="4" fill="#0F172A"/>

      <!-- Landmark: Water Glass -->
      <ellipse cx="490" cy="130" rx="36" ry="36" fill="#94A3B8" opacity="0.25"/>
      <circle cx="485" cy="120" r="32" fill="#E2E8F0" stroke="#64748B" stroke-width="2.5" opacity="0.7"/>
      <circle cx="485" cy="120" r="26" fill="#38BDF8" opacity="0.35"/>

      <!-- Target Item: Brown Leather Cardholder Wallet -->
      <g transform="translate(300, 180) rotate(14)">
        <!-- Shadow -->
        <rect x="5" y="10" width="170" height="115" rx="10" fill="#0F172A" opacity="0.35"/>
        <!-- Wallet Body -->
        <rect x="0" y="0" width="165" height="110" rx="8" fill="url(#leather)" stroke="#5A2408" stroke-width="3"/>
        <!-- Card Slots -->
        <rect x="12" y="14" width="140" height="30" rx="4" fill="#5A2408"/>
        <!-- Top of Credit Card Peeking Out (Navy & Gold) -->
        <rect x="20" y="6" width="124" height="20" rx="3" fill="#1E3A8A" stroke="#3B82F6" stroke-width="1"/>
        <circle cx="125" cy="16" r="5" fill="#F59E0B"/>
        <!-- Second Card Slot -->
        <rect x="12" y="50" width="140" height="28" rx="4" fill="#451A03"/>
        <!-- Stitching Detail -->
        <rect x="4" y="4" width="157" height="102" rx="6" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.75"/>
      </g>

      <!-- Meta Ray-Ban HUD Reticle & Corner Brackets -->
      <path d="M 30 50 L 30 30 L 50 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 50 L 570 30 L 550 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 30 350 L 30 370 L 50 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 350 L 570 370 L 550 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>

      <rect x="290" y="165" width="185" height="135" rx="8" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.9"/>
      <rect x="295" y="150" width="105" height="18" rx="4" fill="#047857"/>
      <text x="347" y="163" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="0.5">LEATHER WALLET</text>

      <rect x="180" y="360" width="240" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="300" y="376" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1">GLASSES POV • BISTRO TABLE</text>
    </svg>
  `),

  waterBottle: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
        <linearGradient id="bottle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#18181B"/>
          <stop offset="45%" stop-color="#27272A"/>
          <stop offset="80%" stop-color="#3F3F46"/>
          <stop offset="100%" stop-color="#18181B"/>
        </linearGradient>
        <linearGradient id="backpack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#15803D"/>
          <stop offset="100%" stop-color="#14532D"/>
        </linearGradient>
      </defs>
      <!-- Floor & Chair Background -->
      <rect width="600" height="400" fill="url(#floor)"/>

      <!-- Landmark: Green Canvas Backpack on Chair -->
      <g transform="translate(110, 80)">
        <ellipse cx="140" cy="270" rx="130" ry="35" fill="#0F172A" opacity="0.5"/>
        <path d="M 50 250 C 40 100, 80 50, 140 50 C 200 50, 240 100, 230 250 Z" fill="url(#backpack)"/>
        <!-- Backpack Front Pocket -->
        <rect x="70" y="160" width="140" height="85" rx="12" fill="#14532D" stroke="#166534" stroke-width="2"/>
        <line x1="85" y1="185" x2="195" y2="185" stroke="#4ADE80" stroke-width="3" stroke-linecap="round"/>
        <rect x="135" y="178" width="10" height="15" fill="#D4D4D8"/>
        <!-- Top Grab Handle -->
        <path d="M 115 50 C 115 25, 165 25, 165 50" fill="none" stroke="#14532D" stroke-width="12" stroke-linecap="round"/>
      </g>

      <!-- Target Item: Matte Black Water Bottle -->
      <g transform="translate(380, 110)">
        <ellipse cx="40" cy="235" rx="35" ry="14" fill="#0F172A" opacity="0.6"/>
        <!-- Bottle Body -->
        <rect x="10" y="80" width="60" height="150" rx="8" fill="url(#bottle)" stroke="#09090B" stroke-width="2"/>
        <!-- Neck -->
        <rect x="22" y="50" width="36" height="32" rx="4" fill="url(#bottle)"/>
        <!-- Cap with Steel Ring -->
        <rect x="18" y="30" width="44" height="22" rx="5" fill="#27272A" stroke="#71717A" stroke-width="2"/>
        <circle cx="40" cy="18" r="10" fill="none" stroke="#A1A1AA" stroke-width="4"/>
      </g>

      <!-- HUD Reticle -->
      <path d="M 30 50 L 30 30 L 50 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 50 L 570 30 L 550 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 30 350 L 30 370 L 50 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 350 L 570 370 L 550 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>

      <rect x="375" y="115" width="90" height="235" rx="8" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.9"/>
      <rect x="370" y="95" width="105" height="18" rx="4" fill="#047857"/>
      <text x="422" y="108" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="0.5">WATER BOTTLE</text>

      <rect x="180" y="360" width="240" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="300" y="376" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1">GLASSES POV • SIDE CHAIR</text>
    </svg>
  `),

  glasses: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="console" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F1F5F9"/>
          <stop offset="100%" stop-color="#E2E8F0"/>
        </linearGradient>
        <linearGradient id="tortoise" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#451A03"/>
          <stop offset="40%" stop-color="#B45309"/>
          <stop offset="70%" stop-color="#78350F"/>
          <stop offset="100%" stop-color="#1E1B4B"/>
        </linearGradient>
      </defs>
      <!-- Hallway Console Table Surface -->
      <rect width="600" height="400" fill="url(#console)"/>
      <line x1="0" y1="80" x2="600" y2="80" stroke="#CBD5E1" stroke-width="2"/>

      <!-- Landmark: Mail Stack -->
      <g transform="translate(80, 130) rotate(-6)">
        <rect x="0" y="0" width="160" height="100" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <line x1="20" y1="35" x2="90" y2="35" stroke="#94A3B8" stroke-width="2"/>
        <line x1="20" y1="55" x2="120" y2="55" stroke="#94A3B8" stroke-width="2"/>
        <rect x="125" y="15" width="22" height="26" fill="#EF4444" rx="2"/>
      </g>

      <!-- Landmark: Ceramic Key Dish Tray -->
      <g transform="translate(420, 130)">
        <ellipse cx="65" cy="65" rx="75" ry="50" fill="#94A3B8" opacity="0.3"/>
        <ellipse cx="60" cy="55" rx="70" ry="46" fill="#FEF3C7" stroke="#FDE68A" stroke-width="3"/>
        <circle cx="50" cy="50" r="10" fill="#CBD5E1" opacity="0.6"/>
      </g>

      <!-- Target Item: Reading Glasses -->
      <g transform="translate(220, 190) rotate(5)">
        <!-- Shadow -->
        <ellipse cx="90" cy="45" rx="85" ry="25" fill="#0F172A" opacity="0.25"/>
        <!-- Left Rim & Lens -->
        <circle cx="45" cy="35" r="32" fill="#E0F2FE" opacity="0.5" stroke="url(#tortoise)" stroke-width="6"/>
        <!-- Right Rim & Lens -->
        <circle cx="135" cy="35" r="32" fill="#E0F2FE" opacity="0.5" stroke="url(#tortoise)" stroke-width="6"/>
        <!-- Bridge -->
        <path d="M 77 30 C 90 22, 100 22, 103 30" fill="none" stroke="url(#tortoise)" stroke-width="6" stroke-linecap="round"/>
        <!-- Temples Folded Back -->
        <path d="M 13 32 L -15 8" fill="none" stroke="url(#tortoise)" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 167 32 L 195 8" fill="none" stroke="url(#tortoise)" stroke-width="4.5" stroke-linecap="round"/>
      </g>

      <!-- HUD Reticle -->
      <path d="M 30 50 L 30 30 L 50 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 50 L 570 30 L 550 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 30 350 L 30 370 L 50 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 350 L 570 370 L 550 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>

      <rect x="200" y="175" width="220" height="95" rx="8" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.9"/>
      <rect x="205" y="158" width="115" height="18" rx="4" fill="#047857"/>
      <text x="262" y="171" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="0.5">READING GLASSES</text>

      <rect x="180" y="360" width="240" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="300" y="376" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1">GLASSES POV • CONSOLE TABLE</text>
    </svg>
  `),

  laptop: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="desk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#desk)"/>
      <!-- Desk Mat -->
      <rect x="80" y="60" width="440" height="290" rx="16" fill="#1E293B" stroke="#475569" stroke-width="2"/>
      <!-- Laptop Base -->
      <rect x="180" y="110" width="240" height="170" rx="8" fill="#94A3B8" stroke="#CBD5E1" stroke-width="2"/>
      <rect x="200" y="125" width="200" height="100" rx="4" fill="#0F172A"/>
      <rect x="245" y="240" width="110" height="30" rx="4" fill="#64748B"/>
      <!-- Mouse -->
      <rect x="445" y="180" width="40" height="65" rx="16" fill="#CBD5E1" stroke="#94A3B8" stroke-width="2"/>

      <path d="M 30 50 L 30 30 L 50 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 50 L 570 30 L 550 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 30 350 L 30 370 L 50 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 350 L 570 370 L 550 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>

      <rect x="170" y="100" width="260" height="190" rx="8" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.9"/>
      <rect x="175" y="85" width="85" height="18" rx="4" fill="#047857"/>
      <text x="217" y="98" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="0.5">LAPTOP</text>

      <rect x="180" y="360" width="240" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="300" y="376" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1">GLASSES POV • OFFICE DESK</text>
    </svg>
  `),

  general: svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="table" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F8FAFC"/>
          <stop offset="100%" stop-color="#E2E8F0"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#table)"/>
      <circle cx="300" cy="200" r="140" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="6,6"/>

      <!-- Landmark items -->
      <circle cx="160" cy="150" r="35" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
      <rect x="390" y="130" width="80" height="110" rx="6" fill="#CBD5E1" stroke="#94A3B8" stroke-width="2"/>

      <!-- Target Center Item Placeholder -->
      <g transform="translate(250, 160)">
        <rect x="0" y="0" width="100" height="70" rx="8" fill="#047857" opacity="0.1" stroke="#047857" stroke-width="2"/>
        <circle cx="50" cy="35" r="18" fill="#047857" opacity="0.2"/>
        <path d="M 40 35 L 47 42 L 62 27" fill="none" stroke="#047857" stroke-width="3" stroke-linecap="round"/>
      </g>

      <path d="M 30 50 L 30 30 L 50 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 50 L 570 30 L 550 30" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 30 350 L 30 370 L 50 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>
      <path d="M 570 350 L 570 370 L 550 370" fill="none" stroke="#10B981" stroke-width="2.5" opacity="0.8"/>

      <rect x="230" y="145" width="140" height="100" rx="8" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.9"/>
      <rect x="180" y="360" width="240" height="24" rx="12" fill="#0F172A" opacity="0.85"/>
      <text x="300" y="376" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1">GLASSES POV • RECORDED SIGHTING</text>
    </svg>
  `),
};

/**
 * Returns a high-definition, realistic eye-level glasses scene snapshot
 * based on item name and category.
 */
export function getItemDummySceneImage(category?: string, name?: string): string {
  const query = `${category || ""} ${name || ""}`.toLowerCase();

  if (query.includes("key") || query.includes("fob") || query.includes("carabiner")) {
    return DUMMY_SCENE_IMAGES.keys;
  }
  if (query.includes("wallet") || query.includes("cardholder") || query.includes("purse") || query.includes("money")) {
    return DUMMY_SCENE_IMAGES.wallet;
  }
  if (query.includes("bottle") || query.includes("drink") || query.includes("cup") || query.includes("thermos")) {
    return DUMMY_SCENE_IMAGES.waterBottle;
  }
  if (query.includes("glass") || query.includes("spectacle") || query.includes("eyewear") || query.includes("shade")) {
    return DUMMY_SCENE_IMAGES.glasses;
  }
  if (query.includes("laptop") || query.includes("macbook") || query.includes("computer")) {
    return DUMMY_SCENE_IMAGES.laptop;
  }

  return DUMMY_SCENE_IMAGES.general;
}

