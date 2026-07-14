#!/usr/bin/env node
/**
 * Dev helper: test YachtWorld HTML/JSON parsing against a saved file.
 * Usage: node scripts/parse-yachtworld.js [path-to-html-or-json]
 */
import { readFileSync } from 'fs';
import { parseYachtWorldFromPaste } from '../services/ingest/yachtworld.js';

const file = process.argv[2] || 'fixtures/yachtworld-sample.html';
const pastedData = readFileSync(file, 'utf8');

const result = parseYachtWorldFromPaste({ pastedData });

console.log(JSON.stringify(result.fields, null, 2));
console.log('\nWarnings:', result.warnings);
console.log('Fetch method:', result.fetchMethod);
console.log('Source URL (from HTML):', result.fields.sourceUrl);
