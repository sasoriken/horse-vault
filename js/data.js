/**
 * data.js — データフェッチの単一窓口
 *
 * data.bin: GM バイナリフォーマット（gzip + XOR 難読化 + キー短縮）
 *   [0-3]  b'GM\x03\x00'  magic
 *   [4-7]  uint32 BE      元 JSON バイト長
 *   [8..]  XOR64(gzip(compact_json_with_short_keys))
 */
import { KEY_MAP } from './config.js';

// XOR キー（export_web_data.py の _XOR_KEY と完全一致）
const _XOR_KEY = new Uint8Array([
  0x4A, 0x7F, 0x2C, 0xE1, 0x93, 0x5B, 0xD8, 0x0F,
  0xA6, 0x31, 0x7E, 0xC4, 0x59, 0x82, 0x1D, 0xF0,
  0x6B, 0xBE, 0x45, 0x28, 0x9C, 0x73, 0xE7, 0x14,
  0x3F, 0xA0, 0x68, 0xD5, 0x4C, 0x87, 0x2A, 0x91,
  0xC2, 0x56, 0x39, 0xFA, 0x17, 0x8D, 0x64, 0xAB,
  0xE0, 0x7C, 0x3B, 0x95, 0xD1, 0x48, 0x2F, 0x63,
  0x8E, 0xF5, 0x1A, 0x77, 0xC9, 0x04, 0x5E, 0xB2,
  0x30, 0x9F, 0x6D, 0xE8, 0x53, 0xA4, 0x19, 0x76,
]);

const _MAGIC = [0x47, 0x4D, 0x03, 0x00]; // "GM\x03\x00"

let _cache         = null;
let _analyticsCache = null;

/** data.bin を取得・デコードしてキャッシュする。 */
export async function fetchData() {
  if (_cache) return _cache;

  const res = await fetch('./data/data.bin');
  if (!res.ok) throw new Error(`data fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // マジックバイト検証
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== _MAGIC[i]) throw new Error(`invalid GM magic at byte ${i}`);
  }

  // XOR 復号（ヘッダー 8 バイトの後からデータ開始）
  const payload = bytes.subarray(8);
  const klen    = _XOR_KEY.length;
  const decrypted = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i++) {
    decrypted[i] = payload[i] ^ _XOR_KEY[i % klen];
  }

  // gzip 展開
  const ds     = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(decrypted);
  writer.close();

  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total  = chunks.reduce((s, c) => s + c.length, 0);
  const joined = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { joined.set(c, off); off += c.length; }

  // JSON パース + キー復元
  const raw = JSON.parse(new TextDecoder().decode(joined));
  _cache = _remapKeys(raw, KEY_MAP);
  return _cache;
}

/** analytics.json を取得してキャッシュする（バックテスト分析データ）。 */
export async function fetchAnalytics() {
  if (_analyticsCache) return _analyticsCache;
  const res = await fetch('./data/analytics.json');
  if (!res.ok) throw new Error(`analytics fetch failed: ${res.status}`);
  _analyticsCache = await res.json();
  return _analyticsCache;
}

/** キャッシュをクリアして再フェッチさせる */
export function invalidateCache() {
  _cache         = null;
  _analyticsCache = null;
}

/** 再帰的にキーをリマップする（短縮キー → フルキー）。 */
function _remapKeys(obj, map) {
  if (Array.isArray(obj)) return obj.map(v => _remapKeys(v, map));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [map[k] ?? k, _remapKeys(v, map)])
    );
  }
  return obj;
}
