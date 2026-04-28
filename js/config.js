/**
 * config.js — スロット定義・ラベルマッピング・将来のキーマップ
 *
 * 指標の追加・削除はここだけ変更すればUI全体に反映される。
 * 難読化バイナリ移行時は KEY_MAP を埋めて data.js の fetchData() を差し替えるだけ。
 */

/** カテゴリ別スロット定義 */
export const INDICATOR_SLOTS = {
  horse_ability: {
    label: 'Horse Ability',
    color: 'color-ability',
    accent: '#00F0FF',
  },
  race_fit: {
    label: 'Race Fit',
    color: 'color-fit',
    accent: '#00FF88',
  },
  form: {
    label: 'Form',
    color: 'color-form',
    accent: '#FFB800',
  },
  jockey: {
    label: 'Jockey',
    color: 'color-jockey',
    accent: '#CC44FF',
  },
  composite: {
    label: 'Composite',
    color: 'color-composite',
    accent: '#FF003C',
  },
};

/** カテゴリの表示順 */
export const SLOT_ORDER = ['horse_ability', 'race_fit', 'form', 'jockey', 'composite'];

/**
 * 難読化バイナリ移行用キーマップ（将来記入）
 * 例: KEY_MAP['h'] = 'horse_name'
 * data.js の remapKeys() で使用する。
 */
export const KEY_MAP = {};

/** 地面タイプ表示名 */
export const SURFACE_LABELS = {
  turf: '芝',
  dirt: 'ダ',
  obstacle: '障',
};

/** 馬場状態表示名 */
export const CONDITION_LABELS = {
  good: '良',
  slightly_heavy: '稍重',
  heavy: '重',
  bad: '不良',
};

/** レースクラス表示色 */
export const CLASS_ACCENT = {
  G1: '#FFB800',
  G2: '#A0A0B0',
  G3: '#CD7F32',
};
