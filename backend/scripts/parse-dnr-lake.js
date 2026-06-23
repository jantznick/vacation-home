import { readFileSync } from 'node:fs';
import { importDnrLakeFromHtml } from '../services/ingest/wiDnrLake.js';

const [overviewPath, factsPath] = process.argv.slice(2);

if (!overviewPath || !factsPath) {
  console.error('Usage: npm run parse:dnr-lake -- <overview.html> <facts.html>');
  process.exit(1);
}

const overviewHtml = readFileSync(overviewPath, 'utf8');
const factsHtml = readFileSync(factsPath, 'utf8');

const result = importDnrLakeFromHtml({ overviewHtml, factsHtml });

console.log(JSON.stringify(result, null, 2));
