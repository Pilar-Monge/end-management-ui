const fs = require('fs');
const path = require('path');

const filePath = path.resolve(
  'src/features/admin-dashboard/pages/AdminDashboardPage.tsx'
);

// CP1252 special range (0x80-0x9F) -> Unicode code point
const cp1252Special = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
  0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6,
  0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
  0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
  0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
};

// Reverse: Unicode code point -> CP1252 byte
const unicodeToCP1252 = new Map();
for (const [byte, unicode] of Object.entries(cp1252Special)) {
  unicodeToCP1252.set(unicode, parseInt(byte));
}
for (let i = 0x00; i <= 0x7F; i++) unicodeToCP1252.set(i, i);
for (let i = 0xA0; i <= 0xFF; i++) unicodeToCP1252.set(i, i);

const content = fs.readFileSync(filePath, 'utf8');

// Strip UTF-8 BOM if present
const stripped = content.startsWith('\uFEFF') ? content.slice(1) : content;

// Convert each character back to its CP1252 byte
const bytes = [];
for (const char of stripped) {
  const cp = char.codePointAt(0);
  if (unicodeToCP1252.has(cp)) {
    bytes.push(unicodeToCP1252.get(cp));
  } else {
    // Not in CP1252 - encode as UTF-8 directly (shouldn't happen in valid mojibake)
    for (const b of Buffer.from(char, 'utf8')) bytes.push(b);
  }
}

// Decode the recovered bytes as UTF-8 (original encoding)
const fixed = Buffer.from(bytes).toString('utf8');

fs.writeFileSync(filePath, fixed, 'utf8');
console.log('✓ Encoding fixed!');
console.log('  Before:', content.length, 'chars');
console.log('  After: ', fixed.length, 'chars');
