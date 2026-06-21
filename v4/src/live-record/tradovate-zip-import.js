function readUint16(view, offset) {
  return view.getUint16(offset, true);
}

function readUint32(view, offset) {
  return view.getUint32(offset, true);
}

async function inflateRawZipMember(bytes) {
  if (!('DecompressionStream' in window)) {
    throw new Error('This browser cannot inflate zipped CSV files. Select CSV files directly.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(stream).text();
}

export async function readZipCsvEntries(file) {
  if (!file) return [];
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('Invalid ZIP package: end-of-central-directory not found.');
  const entryCount = readUint16(view, eocdOffset + 10);
  let centralOffset = readUint32(view, eocdOffset + 16);
  const decoder = new TextDecoder();
  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, centralOffset) !== 0x02014b50) {
      throw new Error('Invalid ZIP package: central directory is malformed.');
    }
    const flags = readUint16(view, centralOffset + 8);
    const method = readUint16(view, centralOffset + 10);
    const compressedSize = readUint32(view, centralOffset + 20);
    const nameLength = readUint16(view, centralOffset + 28);
    const extraLength = readUint16(view, centralOffset + 30);
    const commentLength = readUint16(view, centralOffset + 32);
    const localOffset = readUint32(view, centralOffset + 42);
    const nameBytes = bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength);
    const name = decoder.decode(nameBytes);
    centralOffset += 46 + nameLength + extraLength + commentLength;
    if (!name.toLowerCase().endsWith('.csv')) continue;
    if (readUint32(view, localOffset) !== 0x04034b50) {
      throw new Error(`Invalid ZIP package: local header missing for ${name}.`);
    }
    if (flags & 0x01) throw new Error(`Encrypted ZIP entry is not supported: ${name}`);
    const localNameLength = readUint16(view, localOffset + 26);
    const localExtraLength = readUint16(view, localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    const text = method === 0
      ? decoder.decode(compressed)
      : method === 8
        ? await inflateRawZipMember(compressed)
        : (() => { throw new Error(`Unsupported ZIP compression method ${method} for ${name}.`); })();
    entries.push({ name, text });
  }
  return entries;
}

export function classifyTradovateCsvEntry(entry) {
  const name = String(entry?.name || '').toLowerCase();
  if (name.includes('account') && name.includes('balance')) return 'accountBalanceHistoryText';
  if (name.includes('position')) return 'positionHistoryText';
  if (name.includes('cash')) return 'cashHistoryText';
  if (name.includes('fill')) return 'fillsText';
  if (name.includes('order')) return 'ordersText';
  if (name.includes('performance')) return 'performanceText';
  const header = String(entry?.text || '').split(/\r?\n/, 1)[0].toLowerCase();
  if (header.includes('buyfillid') && header.includes('sellfillid')) return 'performanceText';
  if (header.includes('buy fill id') && header.includes('sell fill id')) return 'positionHistoryText';
  if (header.includes('fill id') && header.includes('order id') && header.includes('commission')) return 'fillsText';
  if (header.includes('order id') && header.includes('limit price') && header.includes('stop price')) return 'ordersText';
  if (header.includes('cash change type')) return 'cashHistoryText';
  if (header.includes('total realized pnl')) return 'accountBalanceHistoryText';
  return '';
}

export async function readTradovateImportInputs({
  zipFile = null,
  performanceFile = null,
  ordersFile = null,
  fillsFile = null,
  positionFile = null,
  cashFile = null,
  balanceFile = null,
} = {}) {
  const zipEntries = await readZipCsvEntries(zipFile);
  const fromZip = {};
  const zipMatches = [];
  zipEntries.forEach((entry) => {
    const key = classifyTradovateCsvEntry(entry);
    if (!key) return;
    if (!fromZip[key]) {
      fromZip[key] = entry.text;
      zipMatches.push(`${entry.name} -> ${key.replace(/Text$/, '')}`);
    }
  });
  const texts = {
    performanceText: fromZip.performanceText || '',
    ordersText: fromZip.ordersText || '',
    fillsText: fromZip.fillsText || '',
    positionHistoryText: fromZip.positionHistoryText || '',
    cashHistoryText: fromZip.cashHistoryText || '',
    accountBalanceHistoryText: fromZip.accountBalanceHistoryText || '',
  };
  if (performanceFile) texts.performanceText = await performanceFile.text();
  if (ordersFile) texts.ordersText = await ordersFile.text();
  if (fillsFile) texts.fillsText = await fillsFile.text();
  if (positionFile) texts.positionHistoryText = await positionFile.text();
  if (cashFile) texts.cashHistoryText = await cashFile.text();
  if (balanceFile) texts.accountBalanceHistoryText = await balanceFile.text();
  if (!String(texts.performanceText || '').trim()) {
    throw new Error('Performance CSV was not found. Select it directly or include it in the ZIP package.');
  }
  return {
    ...texts,
    sourceFileName: performanceFile?.name || zipFile?.name || 'tradovate-package.zip',
    zipFileName: zipFile?.name || '',
    zipMatches,
  };
}
