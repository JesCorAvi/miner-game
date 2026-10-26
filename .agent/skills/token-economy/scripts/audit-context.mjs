#!/usr/bin/env node
// Audita el coste de contexto, la documentación y la modularidad de Carbon Magnate.
// Uso: node .claude/skills/token-economy/scripts/audit-context.mjs [--json]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const JSON_OUT = process.argv.includes('--json');

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

function read(relative) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) {
    fail(`No existe ${relative}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function bytesOf(text) {
  return Buffer.byteLength(text, 'utf8');
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function walk(dir, extensions, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'release' || entry.name === '.git') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extensions, out);
    else if (extensions.some((extension) => entry.name.endsWith(extension))) out.push(full);
  }
}

function relative(full) {
  return path.relative(ROOT, full).replace(/\\/g, '/');
}

function listFiles(base) {
  const out = [];
  if (!fs.existsSync(base)) return out;
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else out.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  };
  visit(base);
  return out.sort();
}

const DOCS = ['CLAUDE.md', 'AGENTS.md', 'plan.md', 'README.md'];
const docText = new Map();
for (const doc of DOCS) {
  docText.set(doc, read(doc));
}

// ---------------------------------------------------------------------------
// 1. Inventario de código
// ---------------------------------------------------------------------------
const codeFiles = [];
walk(path.join(ROOT, 'src'), ['.ts', '.css'], codeFiles);
for (const extra of ['index.html', 'electron/main.cjs', 'vite.config.ts', 'package.json', 'tsconfig.json']) {
  const full = path.join(ROOT, extra);
  if (fs.existsSync(full)) codeFiles.push(full);
}

const inventory = codeFiles
  .map((full) => {
    const text = fs.readFileSync(full, 'utf8');
    return {
      file: relative(full),
      lines: lineCount(text),
      bytes: bytesOf(text),
    };
  })
  .sort((a, b) => b.lines - a.lines);

const TOP_FILES = inventory.slice(0, 10);

const BUDGETS = [
  { label: 'TS', max: 900, test: (file) => file.endsWith('.ts') },
  { label: 'CSS', max: 1200, test: (file) => file.endsWith('.css') },
  { label: 'HTML', max: 600, test: (file) => file === 'index.html' },
];
for (const entry of inventory) {
  for (const budget of BUDGETS) {
    if (!budget.test(entry.file)) continue;
    if (entry.lines > budget.max) {
      warn(
        `${entry.file}: ${entry.lines} líneas (presupuesto ${budget.label} ${budget.max}); divide por dominio antes de seguir creciendo`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Documentos auto-cargados y skills
// ---------------------------------------------------------------------------
const DOC_BUDGETS = [
  ['CLAUDE.md', 450],
  ['AGENTS.md', 250],
  ['plan.md', 700],
  ['README.md', 250],
];
for (const [doc, max] of DOC_BUDGETS) {
  const text = docText.get(doc) || '';
  const lines = lineCount(text);
  if (lines > max) {
    warn(`${doc}: ${lines} líneas (presupuesto ${max}); mueve detalle a referencias bajo demanda`);
  }
}

const skillRoot = path.join(ROOT, '.claude/skills');
const skillDirs = fs.existsSync(skillRoot)
  ? fs
      .readdirSync(skillRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

const skillDocs = [];
for (const skill of skillDirs) {
  const skillPath = path.join(skillRoot, skill, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    fail(`.claude/skills/${skill}: falta SKILL.md`);
    continue;
  }
  const text = fs.readFileSync(skillPath, 'utf8');
  skillDocs.push({ skill, file: `SKILL.md`, lines: lineCount(text), bytes: bytesOf(text) });
  if (lineCount(text) > 160) {
    warn(`.claude/skills/${skill}/SKILL.md: ${lineCount(text)} líneas; el cuerpo debe ser operativo, no un manual`);
  }
  const refsDir = path.join(skillRoot, skill, 'references');
  if (fs.existsSync(refsDir)) {
    for (const entry of fs.readdirSync(refsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const full = path.join(refsDir, entry.name);
      const refText = fs.readFileSync(full, 'utf8');
      const refLines = lineCount(refText);
      skillDocs.push({
        skill,
        file: `references/${entry.name}`,
        lines: refLines,
        bytes: bytesOf(refText),
      });
      if (refLines > 240) {
        warn(`.claude/skills/${skill}/references/${entry.name}: ${refLines} líneas; divide por contrato`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Consistencia de la tabla de skills
// ---------------------------------------------------------------------------
function parseSkillTable(text, doc) {
  const entries = [];
  const pattern = /^\|\s*`([a-z0-9-]+)`\s*\|[^|]*\|\s*`(node\s+[^`]+)`\s*\|/gm;
  for (const match of text.matchAll(pattern)) {
    entries.push({ name: match[1], audit: match[2], doc });
  }
  return entries;
}

const declared = [
  ...parseSkillTable(docText.get('CLAUDE.md') || '', 'CLAUDE.md'),
  ...parseSkillTable(docText.get('AGENTS.md') || '', 'AGENTS.md'),
];
for (const entry of declared) {
  if (!skillDirs.includes(entry.name)) {
    fail(`${entry.doc}: declara «${entry.name}» pero no existe .claude/skills/${entry.name}`);
  }
  const auditRelative = entry.audit.replace(/^node\s+/, '');
  if (!fs.existsSync(path.join(ROOT, auditRelative))) {
    fail(`${entry.doc}: la auditoría de «${entry.name}» no existe: ${auditRelative}`);
  }
}
for (const skill of skillDirs) {
  if (!declared.some((entry) => entry.name === skill)) {
    fail(`.claude/skills/${skill}: no está declarada en CLAUDE.md ni AGENTS.md`);
  }
  const body = read(`.claude/skills/${skill}/SKILL.md`);
  const refsDir = path.join(skillRoot, skill, 'references');
  if (fs.existsSync(refsDir)) {
    for (const entry of fs.readdirSync(refsDir)) {
      if (entry.endsWith('.md') && !body.includes(`references/${entry}`)) {
        fail(`.claude/skills/${skill}: la referencia references/${entry} no está enlazada desde SKILL.md`);
      }
    }
  }
  const scriptsDir = path.join(skillRoot, skill, 'scripts');
  const scripts = fs.existsSync(scriptsDir)
    ? fs.readdirSync(scriptsDir).filter((entry) => entry.endsWith('.mjs'))
    : [];
  if (scripts.length === 0) {
    warn(`.claude/skills/${skill}: no tiene script de auditoría`);
  }
  for (const script of scripts) {
    const mentioned = body.includes(`scripts/${script}`) ||
      declared.some((entry) => entry.name === skill && entry.audit.includes(script));
    if (!mentioned) {
      warn(`.claude/skills/${skill}: el script ${script} no se menciona en SKILL.md ni en las tablas`);
    }
  }
}
for (const entry of declared) {
  const inOtherDoc = declared.some((other) => other.name === entry.name && other.doc !== entry.doc);
  if (!inOtherDoc && entry.doc === 'CLAUDE.md') {
    warn(`AGENTS.md: falta la skill «${entry.name}» en su tabla`);
  }
  if (!inOtherDoc && entry.doc === 'AGENTS.md') {
    warn(`CLAUDE.md: falta la skill «${entry.name}» en su tabla`);
  }
}
const uniqueDeclared = [...new Set(declared.map((entry) => entry.name))];

// ---------------------------------------------------------------------------
// 4. Espejo .agent/skills
// ---------------------------------------------------------------------------
const agentRoot = path.join(ROOT, '.agent/skills');
if (!fs.existsSync(agentRoot)) {
  warn('.agent/skills no existe; ejecuta node scripts/sync-agent-skills.mjs');
} else {
  const canonical = listFiles(skillRoot);
  const mirror = listFiles(agentRoot);
  const missing = canonical.filter((file) => !mirror.includes(file));
  const extra = mirror.filter((file) => !canonical.includes(file));
  if (missing.length > 0 || extra.length > 0) {
    fail(
      `.agent/skills no es espejo de .claude/skills (${missing.length} ausentes, ${extra.length} sobrantes); ejecuta node scripts/sync-agent-skills.mjs`,
    );
  }
}

// ---------------------------------------------------------------------------
// 5. Duplicación documental
// ---------------------------------------------------------------------------
function normalize(line) {
  return line.trim().replace(/\s+/g, ' ');
}

const duplicationDocs = new Map(docText);
for (const entry of skillDocs) {
  const relativePath = `.claude/skills/${entry.skill}/${entry.file}`;
  duplicationDocs.set(relativePath, read(relativePath));
}

const prose = new Map();
const tableRows = new Map();
for (const [doc, text] of duplicationDocs) {
  for (const raw of text.split(/\r?\n/)) {
    const line = normalize(raw);
    if (line.length < 80) continue;
    if (line.startsWith('```') || line.startsWith('#')) continue;
    if (/^\d+\./.test(line)) continue;
    // La tabla de skills debe repetirse en CLAUDE.md y AGENTS.md: no es duplicación evitable.
    if (/^\|\s*`[a-z0-9-]+`\s*\|[^|]*\|\s*`node\s+/.test(line)) continue;
    const target = line.startsWith('|') ? tableRows : prose;
    if (!target.has(line)) target.set(line, new Set());
    target.get(line).add(doc);
  }
}
const duplicatedProse = [...prose.entries()].filter(([, docs]) => docs.size >= 2);
const duplicatedRows = [...tableRows.entries()].filter(([, docs]) => docs.size >= 2);
const duplicatedBytes = duplicatedProse.reduce((sum, [line]) => sum + bytesOf(line), 0);
const duplicateExamples = [...duplicatedProse, ...duplicatedRows]
  .slice(0, 4)
  .map(([line, docs]) => ({ line: line.slice(0, 120), docs: [...docs] }));
if (duplicatedProse.length > 0) {
  warn(
    `${duplicatedProse.length} líneas de prosa aparecen en 2+ documentos (~${duplicatedBytes} bytes); valora enlazar en vez de copiar`,
  );
}
if (duplicatedRows.length > 0) {
  warn(`${duplicatedRows.length} filas de tabla se repiten entre documentos; mantén una fuente y enlaza`);
}

// ---------------------------------------------------------------------------
// 6. Métodos grandes de Game.ts
// ---------------------------------------------------------------------------
const gameText = read('src/core/Game.ts');
const CONTROL_KEYWORDS = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'return',
  'throw',
  'new',
  'else',
  'do',
  'try',
]);
const methodMatches = [
  ...gameText.matchAll(/^ {2}(?:private |public |protected |async )?(?:constructor|[A-Za-z_]\w*)\s*\(/gm),
];
const methodLines = methodMatches
  .map((match) => ({
    match,
    name: match[0]
      .trim()
      .replace(/^(private |public |protected |async )/, '')
      .replace(/\s*\($/, ''),
  }))
  .filter((entry) => !CONTROL_KEYWORDS.has(entry.name));
const methods = methodLines.map((entry, index) => {
  const line = gameText.slice(0, entry.match.index).split(/\r?\n/).length;
  const next = index + 1 < methodLines.length
    ? gameText.slice(0, methodLines[index + 1].match.index).split(/\r?\n/).length
    : lineCount(gameText);
  return { name: `${entry.name}()`, line, span: next - line };
}).sort((a, b) => b.span - a.span);
const largeMethods = methods.filter((method) => method.span >= 90).slice(0, 6);
for (const method of largeMethods) {
  if (method.span > 140) {
    warn(`Game.ts: ${method.name} ocupa ~${method.span} líneas; considera extraerlo a un servicio`);
  }
}

// ---------------------------------------------------------------------------
// 7. Estimación de contexto auto-cargado
// ---------------------------------------------------------------------------
function frontmatterDescription(skill) {
  const text = read(`.claude/skills/${skill}/SKILL.md`);
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!block) return `${skill}: (sin frontmatter)`;
  const name = /^name:\s*(.+)$/m.exec(block[1])?.[1]?.trim() || skill;
  const description = /^description:\s*"?(.+?)"?$/m.exec(block[1])?.[1]?.trim() || '';
  return `${name}: ${description}`;
}

const descriptions = skillDirs.map(frontmatterDescription).join('\n');
const claudeAuto = (docText.get('CLAUDE.md') || '') + '\n' + descriptions;
const agentsAuto = (docText.get('AGENTS.md') || '') + '\n' + descriptions;
const claudeTokens = Math.ceil(bytesOf(claudeAuto) / 4);
const agentsTokens = Math.ceil(bytesOf(agentsAuto) / 4);
if (claudeTokens > 10000) {
  warn(`CLAUDE.md + descripciones ≈ ${claudeTokens} tokens; recorta el documento auto-cargado`);
}
if (agentsTokens > 10000) {
  warn(`AGENTS.md + descripciones ≈ ${agentsTokens} tokens; recorta el documento de agentes`);
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
const report = {
  ok: errors.length === 0,
  claudeTokens,
  agentsTokens,
  skills: skillDirs.length,
  declaredSkills: uniqueDeclared.length,
  topFiles: TOP_FILES,
  largeMethods,
  duplicateProse: duplicatedProse.length,
  duplicateTableRows: duplicatedRows.length,
  duplicateExamples,
  errors,
  warnings,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Auditoría de economía de contexto — Carbon Magnate');
  console.log(
    `Contexto auto-cargado: ~${claudeTokens} tokens (CLAUDE.md + ${skillDirs.length} descripciones) · ~${agentsTokens} con AGENTS.md`,
  );
  console.log(
    `Skills declaradas: ${uniqueDeclared.length} (${declared.length} referencias en tablas) · presentes: ${skillDirs.length}`,
  );
  console.log('\nArchivos más grandes:');
  for (const entry of TOP_FILES) {
    console.log(`  ${String(entry.lines).padStart(5)} líneas  ${entry.file}`);
  }
  if (largeMethods.length > 0) {
    console.log('\nMétodos grandes de Game.ts:');
    for (const method of largeMethods) {
      console.log(`  ${String(method.span).padStart(4)} líneas  ${method.name} (línea ${method.line})`);
    }
  }
  console.log(
    `\nDuplicación: ${duplicatedProse.length} líneas de prosa (~${duplicatedBytes} bytes) y ${duplicatedRows.length} filas de tabla en 2+ documentos.`,
  );
  for (const example of duplicateExamples) {
    console.log(`  · ${example.docs.join(' + ')} :: ${example.line}`);
  }
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`\n${errors.length} error(es), ${warnings.length} warning(s).`);
}

process.exit(errors.length === 0 ? 0 : 1);
