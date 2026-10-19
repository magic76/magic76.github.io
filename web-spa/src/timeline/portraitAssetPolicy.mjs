const AGES = [7,10,13,16,19,22,25,35,40,50,55,70];
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value > 0;

/** Resolve only a complete, human-reviewed pair bound to its immutable anchor. */
export function approvedPortrait(manifest, characterId, age, kind) {
 if (!['ethan','hana'].includes(characterId) || !AGES.includes(age) || !['fullbody','avatar'].includes(kind) || manifest?.schemaVersion !== 1) return null;
 const anchor = manifest.anchors?.[characterId];
 const matches = manifest.images?.filter(row => row.characterId === characterId && row.age === age);
 if (matches?.length !== 1) return null;
 const row = matches[0], review = row.humanApproval;
 if (row.status !== 'approved' || !review || typeof review.reviewer !== 'string' || !review.reviewer.trim() || typeof review.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(review.reviewedAt) || !Number.isFinite(Date.parse(review.reviewedAt))) return null;
 if (anchor?.age !== 25 || anchor.status !== 'approved' || !hash(anchor.sha256) || row.anchorSha256 !== anchor.sha256) return null;
 for (const type of ['fullbody','avatar']) {
  const asset = row[type], full = type === 'fullbody';
  if (!asset || asset.path !== `timeline/${full?'fullbody':'avatars'}/${characterId}-${age}.webp` || asset.width !== (full?900:320) || asset.height !== (full?1200:320) || !integer(asset.sizeBytes) || asset.sizeBytes >= (full?350000:80000) || !hash(asset.sha256)) return null;
 }
 if (review.fullbodySha256 !== row.fullbody.sha256 || review.avatarSha256 !== row.avatar.sha256 || row.avatar.sourceSha256 !== row.fullbody.sha256) return null;
 if (age === 25 && row.fullbody.sha256 !== anchor.sha256) return null;
 const crop = row.avatar.crop;
 if (!crop || ![crop.x,crop.y,crop.width,crop.height].every(Number.isSafeInteger) || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.width !== crop.height || crop.x + crop.width > 900 || crop.y + crop.height > 1200) return null;
 return row[kind];
}

export function webpDimensions(bytes) {
 const data = new Uint8Array(bytes), view = new DataView(bytes);
 const text = (a,b) => String.fromCharCode(...data.slice(a,b));
 if (data.length < 30 || text(0,4) !== 'RIFF' || text(8,12) !== 'WEBP' || view.getUint32(4,true) + 8 !== data.length) throw Error('Invalid WebP');
 const kind = text(12,16), u24 = offset => data[offset] | data[offset+1]<<8 | data[offset+2]<<16;
 if (kind === 'VP8X') return {width:1+u24(24),height:1+u24(27)};
 if (kind === 'VP8 ' && data[23]===0x9d && data[24]===1 && data[25]===0x2a) return {width:view.getUint16(26,true)&0x3fff,height:view.getUint16(28,true)&0x3fff};
 if (kind === 'VP8L' && data[20]===0x2f) return {width:1+(((data[22]&0x3f)<<8)|data[21]),height:1+(((data[24]&15)<<10)|(data[23]<<2)|((data[22]&0xc0)>>6))};
 throw Error('Unsupported WebP');
}

/** Fail closed for network errors, unavailable crypto, missing or tampered files. */
export async function verifiedPortraitBlob(asset, fetcher = fetch, subtle = globalThis.crypto?.subtle) {
 if (!asset || !subtle) return null;
 try {
  const response = await fetcher('/assets/' + asset.path, {credentials:'same-origin'});
  if (!response.ok) return null;
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== asset.sizeBytes) return null;
  const dims = webpDimensions(bytes);
  if (dims.width !== asset.width || dims.height !== asset.height) return null;
  const digest = Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)), b => b.toString(16).padStart(2,'0')).join('');
  return digest === asset.sha256 ? new Blob([bytes],{type:'image/webp'}) : null;
 } catch { return null; }
}
