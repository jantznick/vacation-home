import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSailboatDataHtml } from '../services/ingest/sailboatdata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = process.argv[2]
  || path.join(__dirname, '../fixtures/sailboatdata-first-367.html');

const html = fs.readFileSync(fixturePath, 'utf8');
const result = parseSailboatDataHtml(html, {
  sourceUrl: 'https://sailboatdata.com/sailboat/first-367-beneteau/',
});

console.log(JSON.stringify(result, null, 2));
