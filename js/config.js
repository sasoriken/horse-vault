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
 * 難読化バイナリ用キーマップ: 短縮キー → フルキー
 * export_web_data.py の _KEY_MAP_ENCODE と逆対応。
 */
export const KEY_MAP = {
  // meta
  ga: 'generated_at', sv: 'schema_version', ch: 'commit_hash', dw: 'days_window',
  // horse
  nm: 'name', ag: 'age', sx: 'sex',
  ld: 'last_race_date', lv: 'last_venue', lr: 'last_race_name',
  er: 'elo_raw', v4: 'v4_raw', rd: 'radar',
  // radar
  sp: 'speed_peak', cf: 'current_form', cg: 'class_grade',
  cl: 'closing', qw: 'quality_wins', cy: 'consistency',
  // race
  ri: 'race_id', dt: 'date', vn: 'venue', rn: 'race_number',
  rm: 'race_name', rc: 'race_class', sf: 'surface',
  di: 'distance', fs: 'field_size', co: 'condition',
  tb: 'track_bias', nk: 'netkeiba_race_id', pf: 'payoffs', en: 'entries',
  // entry
  hn: 'horse_name', fn: 'frame_number', hm: 'horse_number',
  wt: 'weight', jk: 'jockey', tn: 'trainer',
  od: 'odds', pp: 'popularity',
  pw: 'predicted_win_rate', pr: 'prediction_rank',
  af: 'actual_finish', ig: 'indicators',
  // indicator categories
  ha: 'horse_ability', rf: 'race_fit', fm: 'form', cp: 'composite',
  // indicator object fields
  lb: 'label', va: 'value', nr: 'norm', ut: 'unit',
};

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
