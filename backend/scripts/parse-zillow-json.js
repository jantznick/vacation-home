#!/usr/bin/env node
/**
 * Dev helper: test Zillow JSON parsing against a saved paste file.
 * Usage: node scripts/parse-zillow-json.js [path-to-json]
 */
import { readFileSync } from 'fs';
import { parseZillowFromPaste } from '../services/ingest/zillow.js';

const file = process.argv[2] || 'data.json';
const pastedData = readFileSync(file, 'utf8');

const result = parseZillowFromPaste({
  sourceUrl: 'https://www.zillow.com/homedetails/dev-test/97236350_zpid/',
  pastedData,
});

console.log(JSON.stringify(result.fields, null, 2));
console.log('\nWarnings:', result.warnings);
