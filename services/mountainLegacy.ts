import type { Achievement } from '../types';

export const MOUNTAIN_LEGACY_BANK_KEY = 'cyberHike_mountain_legacy_bank_v1';
export const MOUNTAIN_HISTORY_KEY = 'cyberHike_mountain_history_v1';

export interface LegacyAsset {
  itemId: string;
  quantity: number;
}

export interface MountainLegacyBank {
  balance: number;
  equipment: LegacyAsset[];
  updatedAt: string | null;
}

export interface MountainHistoryRecord {
  id: string;
  endedAt: string;
  outcome: 'success' | 'failed';
  routeName: string;
  days: number;
  merit: number;
  landmarksReached: number;
  gold: number;
  titles: string[];
  achievements: string[];
  inheritedEquipment: LegacyAsset[];
}

export interface MountainLegacyBackup {
  format: 'cyberhiking-mountain-legacy';
  version: 1;
  exportedAt: string;
  bank: MountainLegacyBank;
  records: MountainHistoryRecord[];
  unlockedAchievementIds: string[];
}

const DEFAULT_BANK: MountainLegacyBank = { balance: 22200, equipment: [], updatedAt: null };

export const loadMountainLegacyBank = (): MountainLegacyBank => {
  try {
    const raw = localStorage.getItem(MOUNTAIN_LEGACY_BANK_KEY);
    if (!raw) return { ...DEFAULT_BANK, equipment: [] };
    const parsed = JSON.parse(raw) as Partial<MountainLegacyBank>;
    return {
      balance: Number.isFinite(parsed.balance) ? Math.max(0, Math.floor(parsed.balance as number)) : DEFAULT_BANK.balance,
      equipment: Array.isArray(parsed.equipment)
        ? parsed.equipment.filter((x): x is LegacyAsset => !!x && typeof x.itemId === 'string' && Number.isFinite(x.quantity) && x.quantity > 0).map(x => ({ itemId: x.itemId, quantity: Math.min(99, Math.floor(x.quantity)) }))
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null
    };
  } catch {
    return { ...DEFAULT_BANK, equipment: [] };
  }
};

export const saveMountainLegacyBank = (bank: MountainLegacyBank): void => {
  localStorage.setItem(MOUNTAIN_LEGACY_BANK_KEY, JSON.stringify(bank));
};

export const loadMountainHistory = (): MountainHistoryRecord[] => {
  try {
    const raw = localStorage.getItem(MOUNTAIN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is MountainHistoryRecord =>
      !!x && typeof x.id === 'string' && typeof x.endedAt === 'string' &&
      (x.outcome === 'success' || x.outcome === 'failed') && typeof x.routeName === 'string' &&
      Number.isFinite(x.days) && Number.isFinite(x.merit) && Number.isFinite(x.gold) &&
      Array.isArray(x.titles) && Array.isArray(x.achievements) && Array.isArray(x.inheritedEquipment)
    ).slice(0, 100);
  } catch {
    return [];
  }
};

export const saveMountainHistory = (records: MountainHistoryRecord[]): void => {
  localStorage.setItem(MOUNTAIN_HISTORY_KEY, JSON.stringify(records.slice(0, 100)));
};

export const createMountainLegacyBackup = (
  bank: MountainLegacyBank,
  records: MountainHistoryRecord[],
  achievements: Achievement[]
): MountainLegacyBackup => ({
  format: 'cyberhiking-mountain-legacy',
  version: 1,
  exportedAt: new Date().toISOString(),
  bank,
  records,
  unlockedAchievementIds: achievements.filter(a => a.unlocked).map(a => a.id)
});

export const isMountainLegacyBackup = (value: unknown): value is MountainLegacyBackup => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<MountainLegacyBackup>;
  if (v.format !== 'cyberhiking-mountain-legacy' || v.version !== 1 || !v.bank ||
      !Number.isFinite(v.bank.balance) || !Array.isArray(v.bank.equipment) ||
      !Array.isArray(v.records) || !Array.isArray(v.unlockedAchievementIds)) return false;
  const validAssets = v.bank.equipment.every(asset => !!asset && typeof asset.itemId === 'string' && Number.isFinite(asset.quantity) && asset.quantity > 0);
  const validRecords = v.records.every(record => !!record && typeof record.id === 'string' &&
    typeof record.endedAt === 'string' && typeof record.routeName === 'string' &&
    (record.outcome === 'success' || record.outcome === 'failed') &&
    Number.isFinite(record.days) && Number.isFinite(record.merit) && Number.isFinite(record.gold) &&
    Array.isArray(record.titles) && record.titles.every(title => typeof title === 'string') &&
    Array.isArray(record.achievements) && Array.isArray(record.inheritedEquipment));
  return validAssets && validRecords && v.unlockedAchievementIds.every(id => typeof id === 'string');
};
