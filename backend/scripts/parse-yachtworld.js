#!/usr/bin/env node
/**
 * Dev helper: test YachtWorld HTML/JSON parsing against a saved file.
 * Usage: node scripts/parse-yachtworld.js [path-to-html-or-json] [listing-url]
 */
import { readFileSync } from 'fs';
import { parseYachtWorldFromPaste } from '../services/ingest/yachtworld.js';

const file = process.argv[2] || 'fixtures/yachtworld-sample.html';
const pastedData = readFileSync(file, 'utf8');

function guessSourceUrl(html, fallback) {
  const patterns = [
    /property=["']og:url["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:url["']/i,
    /rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
    /href=["']([^"']+)["'][^>]*rel=["']canonical["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.includes('yachtworld.com')) {
      return match[1];
    }
  }
  return fallback;
}

const sourceUrl = process.argv[3]
  || guessSourceUrl(pastedData, 'https://www.yachtworld.com/yacht/1998-catalina-320-3843740/');

const result = parseYachtWorldFromPaste({
  sourceUrl,
  pastedData,
});

console.log(JSON.stringify(result.fields, null, 2));
console.log('\nWarnings:', result.warnings);
console.log('Fetch method:', result.fetchMethod);
console.log('Source URL:', sourceUrl);
