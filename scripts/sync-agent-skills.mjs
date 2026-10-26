#!/usr/bin/env node
// Replica la copia canónica .claude/skills en .agent/skills (Antigravity).
// Uso: node scripts/sync-agent-skills.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SOURCE = path.join(ROOT, '.claude', 'skills');
const DEST = path.join(ROOT, '.agent', 'skills');

if (!fs.existsSync(SOURCE)) {
  console.error('No existe .claude/skills; no hay nada que sincronizar.');
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.cpSync(SOURCE, DEST, { recursive: true });

const skills = fs
  .readdirSync(DEST, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

console.log(`Skills sincronizados en .agent/skills: ${skills.length}`);
for (const skill of skills) console.log(`  - ${skill}`);
