/**
 * data.js — データフェッチの単一窓口
 *
 * 難読化バイナリへの移行時はこのファイルの fetchData() だけ差し替える。
 * 呼び出し側はこの関数だけ使うこと。
 */
import { KEY_MAP } from './config.js';

let _cache = null;

/**
 * data.json を取得してキャッシュする。
 * 将来は matrix_payload.bin (MessagePack+zlib) に差し替え可能。
 */
export async function fetchData() {
  if (_cache) return _cache;
  const res = await fetch('./data/data.json');
  if (!res.ok) throw new Error(`data fetch failed: ${res.status}`);
  _cache = await res.json();
  return _cache;
}

/** キャッシュをクリアして再フェッチさせる */
export function invalidateCache() {
  _cache = null;
}

// ── 将来の難読化バイナリ版 (コメントアウト) ───────────────────────────────
//
// import pako from 'https://cdn.jsdelivr.net/npm/pako@2/dist/pako.esm.mjs';
// import { decode } from 'https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3/dist/esm/index.mjs';
//
// export async function fetchData() {
//   if (_cache) return _cache;
//   const buf = await (await fetch('./data/matrix_payload.bin')).arrayBuffer();
//   const decompressed = pako.inflate(new Uint8Array(buf));
//   const raw = decode(decompressed);
//   _cache = remapKeys(raw, KEY_MAP);
//   return _cache;
// }
//
// function remapKeys(obj, map) {
//   if (Array.isArray(obj)) return obj.map(v => remapKeys(v, map));
//   if (obj && typeof obj === 'object') {
//     return Object.fromEntries(
//       Object.entries(obj).map(([k, v]) => [map[k] ?? k, remapKeys(v, map)])
//     );
//   }
//   return obj;
// }
