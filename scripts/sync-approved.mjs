#!/usr/bin/env node
/**
 * Approved submissions -> data/entries.json
 *
 * Closes the loop: the curator approves on the site, this pulls those rows into
 * the committed catalog and marks them merged so they stop showing as pending.
 *
 *   CONVEX_URL=https://x.convex.cloud STASH_CURATOR_PASSWORD='...' npm run sync
 *
 * Read the passphrase from the environment; never pass it as a CLI argument,
 * which would leave it in shell history and in the process list.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConvexHttpClient } from 'convex/browser';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES = join(ROOT, 'data', 'entries.json');

const convexUrl = process.env.CONVEX_URL;
const passphrase = process.env.STASH_CURATOR_PASSWORD;

if (!convexUrl || !passphrase) {
  console.error('\n  Set CONVEX_URL and STASH_CURATOR_PASSWORD in the environment.\n');
  process.exit(1);
}

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

function uniqueId(base, taken) {
  let id = base || 'entry';
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}

const client = new ConvexHttpClient(convexUrl);
const approved = await client.query('submissions:listApproved', {});

if (!approved.length) {
  console.log('  Nothing approved and waiting. Catalog unchanged.');
  process.exit(0);
}

const file = JSON.parse(await readFile(ENTRIES, 'utf8'));
const taken = new Set(file.entries.map((entry) => entry.id));
const today = new Date().toISOString().slice(0, 10);

const added = approved.map((row) => ({
  id: uniqueId(slugify(row.name), taken),
  name: row.name,
  url: row.url,
  section: row.section,
  why: row.why,
  price: row.price,
  status: 'untried',
  pick: false,
  tags: row.tags || [],
  addedBy: row.submittedBy || 'anonymous',
  addedAt: today,
}));

file.entries.push(...added);
await writeFile(ENTRIES, `${JSON.stringify(file, null, 2)}\n`);

const result = await client.action('admin:markMerged', {
  password: passphrase,
  ids: approved.map((row) => row.id),
});

if (!result?.ok) {
  console.error(`\n  Entries were written but not marked merged: ${result?.error ?? 'unknown error'}`);
  console.error('  They will show as approved again on the next sync.\n');
  process.exit(1);
}

console.log(`  Added ${added.length} entr${added.length === 1 ? 'y' : 'ies'} to data/entries.json:`);
for (const entry of added) console.log(`    ${entry.section.padEnd(16)} ${entry.name}`);
console.log('\n  Now run: make api && git commit\n');
