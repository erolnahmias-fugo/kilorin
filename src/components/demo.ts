/**
 * Fallback view-model data mirroring the design mockups. Server pages fetch real
 * rows and fall back to these so every screen renders faithfully before data exists.
 * (View lives under src/components — presentation only, not domain logic.)
 */

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealView {
  key: MealKey;
  label: string;
  kcal: number;
  photo: boolean;
}

export interface HomeView {
  balance: number;
  todayDelta: number;
  streakDays: number;
  multiplier: number;
  todayKcal: number;
  targetKcal: number;
  meals: MealView[];
  rewardEstimate: number;
  /** End-of-day close instant (epoch ms). */
  dayCloseMs: number;
}

export const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle',
  dinner: 'Akşam',
  snack: 'Snack',
};

export const demoHome: HomeView = {
  balance: 12480,
  todayDelta: 246,
  streakDays: 12,
  multiplier: 1.24,
  todayKcal: 1240,
  targetKcal: 1850,
  meals: [
    { key: 'breakfast', label: 'Kahvaltı', kcal: 420, photo: true },
    { key: 'lunch', label: 'Öğle', kcal: 560, photo: true },
    { key: 'dinner', label: 'Akşam', kcal: 0, photo: false },
    { key: 'snack', label: 'Snack', kcal: 260, photo: false },
  ],
  rewardEstimate: 220,
  dayCloseMs: Date.now() + 5 * 3600_000 + 12 * 60_000 + 44_000,
};

export interface OfferView {
  id: string;
  type: string;
  emoji: string;
  title: string;
  subtitle: string;
  rightTop: string;
  rightTopColor?: 'good' | 'bad' | 'text';
  rightBottom: string;
  footLeft: string;
  footLeftColor?: 'bad' | 't45';
  pricePerLot: number;
  rate?: number | null;
  leverage?: number | null;
  /** Minimum stake for deposit offers. */
  minStake?: number | null;
  /** Live per-lot price for market instruments (server-quoted at page load). */
  unitPrice?: number | null;
}

export const demoOffers: OfferView[] = [
  {
    id: 'o1', type: 'interest', emoji: '🏦', title: 'Vadeli Mevduat',
    subtitle: '3 gün kilitli · erken çekimde faiz yanar',
    rightTop: '%18', rightTopColor: 'good', rightBottom: '3 günde',
    footLeft: 'Min 500 KLR · stok sınırsız', footLeftColor: 't45', pricePerLot: 500,
  },
  {
    id: 'o2', type: 'crypto', emoji: '🪙', title: 'Bitcoin (grup borsası)',
    subtitle: 'Canlı fiyat · kaldıraç yok · anında satılır',
    rightTop: '4.120', rightTopColor: 'text', rightBottom: '▲ %4,2 bugün',
    footLeft: 'Kalan stok: 3 lot', footLeftColor: 't45', pricePerLot: 4120,
  },
  {
    id: 'o3', type: 'crypto', emoji: '💎', title: 'ParlakCoin (SHINE)',
    subtitle: 'Kaldıraç x3 · %25 düşüşte pozisyon tasfiye olur',
    rightTop: "%40'a kadar", rightTopColor: 'good', rightBottom: '12 saatte*',
    footLeft: '*getiri garanti değildir · stok 8 lot', footLeftColor: 't45', pricePerLot: 800, leverage: 3,
  },
  {
    id: 'o4', type: 'real_estate', emoji: '🏠', title: 'Stüdyo Daire',
    subtitle: 'Kira geliri 90 KLR/gün · satışı 24 saat sürer',
    rightTop: '6.500', rightTopColor: 'text', rightBottom: 'KLR',
    footLeft: 'Son 1 adet!', footLeftColor: 'bad', pricePerLot: 6500,
  },
];

export interface HoldingView {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  kind: 'locked' | 'tradable' | 'listable' | 'prestige';
  pnlPct?: number;
  timer?: string;
  gold?: boolean;
}

export const demoPortfolio = {
  net: 18920,
  liquid: 12480,
  valued: 6440,
  suspicious: true,
  holdings: [
    { id: 'h1', emoji: '🏦', title: 'Vadeli Mevduat', subtitle: '500 → 590 KLR vadede', kind: 'locked', timer: '1g 04:12', gold: true },
    { id: 'h2', emoji: '🪙', title: 'BTC · 0,5 lot', subtitle: 'alış 2.060 · şimdi 2.148', kind: 'tradable', pnlPct: 4.3 },
    { id: 'h3', emoji: '💎', title: 'SHINE · x3 kaldıraç', subtitle: 'alış 800 · şimdi 496 · tasfiyeye %13', kind: 'tradable', pnlPct: -38 },
    { id: 'h4', emoji: '🏠', title: 'Stüdyo Daire', subtitle: 'kira +90/gün · satış 24 saat sürer', kind: 'listable' },
    { id: 'h5', emoji: '⌚', title: 'Kolex Daytona', subtitle: 'Prestij varlık · profilde sergileniyor', kind: 'prestige', gold: true },
  ] as HoldingView[],
};

export interface LeaderRow {
  rank: number;
  name: string;
  initial: string;
  streak: number;
  streakBroken?: boolean;
  netWorth: number;
  suspicious?: boolean;
  isMe?: boolean;
  crown?: boolean;
  note?: string;
}

export const demoLeaderboard: LeaderRow[] = [
  { rank: 1, name: 'Deniz', initial: 'D', streak: 21, netWorth: 24150, crown: true },
  { rank: 2, name: 'Burak', initial: 'B', streak: 3, netWorth: 21800, suspicious: true, note: 'kazançlarda −%10' },
  { rank: 3, name: 'Emre (sen)', initial: 'E', streak: 12, netWorth: 18920, isMe: true },
  { rank: 4, name: 'Seda', initial: 'S', streak: 8, netWorth: 14230 },
  { rank: 5, name: 'Can', initial: 'C', streak: 0, streakBroken: true, netWorth: 2940, note: 'kumarhanede son 4.000' },
];

export interface ShopItemView {
  id: string;
  key: string;
  emoji: string;
  name: string;
  description: string;
  price: number;
  cta: string;
  highlight?: boolean;
  primary?: boolean;
}

export const demoShop: ShopItemView[] = [
  { id: 's1', key: 'hat', emoji: '🧢', name: 'Dandik Şapka', description: 'Avatarına takılır. O kadar.', price: 50, cta: 'Al' },
  { id: 's2', key: 'frame', emoji: '🖼', name: 'Neon Çerçeve', description: 'Liderlikte parlarsın.', price: 300, cta: 'Al' },
  { id: 's3', key: 'aiAvatar', emoji: '🤖', name: 'AI Avatar', description: 'Foto yükle, efsaneye dönüş.', price: 750, cta: 'Al', highlight: true, primary: true },
  { id: 's4', key: 'cheatDay', emoji: '🍔', name: 'Cheat Day', description: '1 gün kalori affı. Vicdan hariç.', price: 1000, cta: 'Al' },
  { id: 's5', key: 'dessertBomb', emoji: '💣', name: 'Tatlı Bombası', description: 'Hedef seç → 24 saatte fotolu tatlı loglamak zorunda.', price: 500, cta: 'Hedef seç' },
  { id: 's6', key: 'streakShield', emoji: '🛡', name: 'Streak Kalkanı', description: '1 kaçamağı affeder. Otomatik devreye girer.', price: 400, cta: 'Al' },
];
