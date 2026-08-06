#!/usr/bin/env node
/**
 * data/ -> api/v1/
 *
 * The static API is what agents, the Neorgon hub and search engines read, so it
 * is generated and committed rather than assembled in the browser. Validation
 * runs first: a broken link shape should fail the build, not the page.
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'v1');

const SITE = {
  name: 'Stash',
  url: 'https://stash.neorgon.com/',
  description:
    'A shared stash of design assets to use later: icons, UI kits, pixel art, music and reading.',
};

const PRICES = new Set(['free', 'freemium', 'paid', 'unknown']);

const readJson = async (path) => JSON.parse(await readFile(join(ROOT, path), 'utf8'));

function validate(sections, entries) {
  const problems = [];
  const sectionIds = new Set(sections.map((s) => s.id));
  const seen = new Set();

  for (const section of sections) {
    if (!section.id || !section.label) problems.push(`section missing id or label: ${JSON.stringify(section)}`);
    if (!/^#[0-9a-f]{6}$/i.test(section.accent || '')) problems.push(`${section.id}: accent must be a hex colour`);
  }

  for (const entry of entries) {
    const at = entry.id || entry.name || 'unknown entry';
    if (!entry.id) problems.push(`${at}: missing id`);
    if (seen.has(entry.id)) problems.push(`${at}: duplicate id`);
    seen.add(entry.id);
    if (!sectionIds.has(entry.section)) problems.push(`${at}: unknown section "${entry.section}"`);
    if (!PRICES.has(entry.price)) problems.push(`${at}: unknown price "${entry.price}"`);
    if (!entry.why || entry.why.length < 15) problems.push(`${at}: "why" is too short to be useful`);
    try {
      const url = new URL(entry.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocol');
    } catch {
      problems.push(`${at}: "${entry.url}" is not a valid http(s) URL`);
    }
  }
  return problems;
}

async function main() {
  const [{ sections }, { entries }] = await Promise.all([
    readJson('data/sections.json'),
    readJson('data/entries.json'),
  ]);

  const problems = validate(sections, entries);
  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s) in data/:\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('');
    process.exit(1);
  }

  const bySection = Object.fromEntries(
    sections.map((section) => [section.id, entries.filter((e) => e.section === section.id)]),
  );

  const catalog = {
    generatedAt: new Date().toISOString().slice(0, 10),
    site: SITE,
    agent: {
      purpose:
        'Sources for design assets. Query this before answering with an emoji or inventing an asset link.',
      usage: [
        'Match the request to a section id, then read that section file for a shorter payload.',
        'Always pass on the price field and remind the user that licenses differ per asset.',
        'These are recommendations to try, not endorsements. Nothing here has been vetted in production.',
      ],
      endpoints: {
        catalog: 'https://stash.neorgon.com/api/v1/catalog.json',
        sections: 'https://stash.neorgon.com/api/v1/sections.json',
        section: 'https://stash.neorgon.com/api/v1/sections/{sectionId}.json',
      },
    },
    hub: {
      sectionTitle: 'Stash',
      sectionColor: '#c026d3',
      browseUrl: SITE.url,
      featuredIds: entries.filter((e) => e.pick).map((e) => e.id),
    },
    counts: {
      entries: entries.length,
      sections: sections.length,
      bySection: Object.fromEntries(sections.map((s) => [s.id, bySection[s.id].length])),
    },
    sections,
    entries,
  };

  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'sections'), { recursive: true });

  await writeFile(join(OUT, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  await writeFile(
    join(OUT, 'sections.json'),
    `${JSON.stringify({ generatedAt: catalog.generatedAt, sections }, null, 2)}\n`,
  );

  for (const section of sections) {
    await writeFile(
      join(OUT, 'sections', `${section.id}.json`),
      `${JSON.stringify({ generatedAt: catalog.generatedAt, section, entries: bySection[section.id] }, null, 2)}\n`,
    );
  }

  console.log(`  api/v1 built: ${entries.length} entries across ${sections.length} sections`);
  for (const section of sections) {
    console.log(`    ${section.id.padEnd(16)} ${bySection[section.id].length}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
