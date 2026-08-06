#!/usr/bin/env node
/**
 * Generate the bcrypt hash for the curator passphrase, then set it on the
 * Convex deployment:
 *
 *   node scripts/hash-passphrase.mjs
 *   npx convex env set CURATOR_PASSWORD_HASH '<the hash>'
 *
 * The passphrase itself is never written to disk, never echoed while typing,
 * and never committed. Only the hash leaves this script.
 */
import { hash as bcryptHash } from 'bcryptjs';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

const COST = 12;

function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    stdout.write(prompt);
    // Suppress echo so the passphrase never appears in the terminal or scrollback.
    const onData = (char) => {
      if (['\n', '\r', '\u0004'].includes(String(char))) stdin.removeListener('data', onData);
      else stdout.write('\x1b[2K\x1b[200D' + prompt);
    };
    stdin.on('data', onData);
    rl.question('', (answer) => {
      rl.close();
      stdout.write('\n');
      resolve(answer);
    });
  });
}

const passphrase = await askHidden('Curator passphrase: ');

if (passphrase.length < 12) {
  console.error('\n  Use at least 12 characters. This is the only lock on moderation.\n');
  process.exit(1);
}

const hash = await bcryptHash(passphrase, COST);

console.log('\n  Set it on the deployment with:\n');
console.log(`  npx convex env set CURATOR_PASSWORD_HASH '${hash}'\n`);
