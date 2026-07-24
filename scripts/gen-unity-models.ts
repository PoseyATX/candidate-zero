/**
 * CANDIDATE ZERO — TypeScript → C# model generator
 * =============================================================================
 * WHY THIS EXISTS
 * ---------------
 * The engine is the rules authority (src/engine/api.ts). Unity is a presentation
 * host that talks to it over JSON. Historically the C# side of that boundary was
 * hand-typed — ViewModels.cs, SetupModels.cs, plus *two* private duplicate
 * `Manifest`/`CardDto` classes inside ContentImporter.cs and CardCatalog.cs.
 * Four hand-maintained mirrors of shapes that only ever change on the TS side.
 *
 * That is the tax that actually bites as the cardbase and systems grow: every
 * new field is a manual edit in four places, in two languages, and nothing
 * fails loudly when someone forgets. (It already drifted once: LedgerView.apMax
 * exists in C# and is not emitted by the engine at all.)
 *
 * This generator removes the tax. It reads the real TypeScript types with the
 * TypeScript compiler's own type checker — not a regex, not a hand-kept schema —
 * and emits the C# DTOs. Drift stops being a thing you remember and becomes a
 * thing the build enforces (`npm run gen:unity:check`).
 *
 * Run:    npm run gen:unity
 * Verify: npm run gen:unity:check     (CI — fails if generated output is stale)
 *
 * ADDING A FIELD: add it in TypeScript, run `npm run gen:unity`, done.
 * =============================================================================
 */
import ts from 'typescript';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'unity', 'Scripts', 'Engine', 'Generated');
const CHECK_MODE = process.argv.includes('--check');

// ---------------------------------------------------------------------------
// Configuration — the only hand-maintained part, and it is about *naming*,
// never about field lists.
// ---------------------------------------------------------------------------

/** TS number is ambiguous. Default is int; these are genuinely fractional. */
const FLOAT_FIELDS = new Set([
  'approxOdds', 'rapport', 'rivalRap', 'gotv', 'prop'
]);

/** TS type name -> C# class name (keeps existing call sites compiling). */
const RENAME: Record<string, string> = {
  ActionOption: 'ActionView',
  SetupSelection: 'SetupSelectionDto'
};

/**
 * Anonymous/inline object types need a C# name. Keyed by "OwnerCsName.prop"
 * (append "[]" for the element type of an array-valued property).
 */
const NAME_HINTS: Record<string, string> = {
  'RenderView.identity': 'IdentityView',
  'RenderView.ledger': 'LedgerView',
  'RenderView.pendingDraft': 'PendingDraftView',
  'RenderView.pendingOutside': 'PendingOutsideView',
  'RenderView.log[]': 'LogEventView',
  'PendingDraftView.options[]': 'DraftOptionView',
  'ApplyResult.events[]': 'LogEventView',
  'SetupOptionsView.personas[]': 'SetupChoice',
  'SetupOptionsView.issues[]': 'SetupChoice',
  'SetupOptionsView.districts[]': 'SetupChoice',
  'SetupOptionsView.regions[]': 'SetupChoice',
  'ContentManifest.cardKinds[]': 'CardKindEntry',
  'ContentManifest.personas[]': 'PersonaEntry',
  'ContentManifest.issues[]': 'IssueEntry',
  'ContentManifest.districts[]': 'DistrictEntry',
  'ContentManifest.regions[]': 'RegionEntry',
  'ContentManifest.grounds[]': 'GroundEntry',
  'CardEntry.cost': 'CardCostEntry'
};

/** Types the host deliberately treats as opaque (never inspects the rules). */
const OPAQUE: Record<string, string> = {
  EngineSnapshot: 'JToken'
};

/** Extra hand-written members injected into a generated class. */
const EXTRA_MEMBERS: Record<string, string> = {
  SetupSelectionDto: `
        /// <summary>Serialize for newGame(seed, setup).</summary>
        public string ToJsonObject() => JsonConvert.SerializeObject(this);`,
  ApplyResult: `
        /// <summary>Opaque snapshot as compact JSON for the next engine call.</summary>
        public string SnapshotJson => snapshot == null ? null : snapshot.ToString(Formatting.None);`
};

interface RootSpec {
  file: string;
  /** exported interface / type alias name, or function name when kind='return' */
  name: string;
  kind: 'type' | 'return';
  cs: string;
  /** emit a static Parse(string json) helper */
  parse?: boolean;
  /** which output file this root lands in */
  out: 'engine' | 'content';
}

const ROOTS: RootSpec[] = [
  { file: 'src/engine/api.ts', name: 'RenderView', kind: 'type', cs: 'RenderView', parse: true, out: 'engine' },
  { file: 'src/engine/api.ts', name: 'ApplyResult', kind: 'type', cs: 'ApplyResult', parse: true, out: 'engine' },
  { file: 'src/engine/api.ts', name: 'setupOptions', kind: 'return', cs: 'SetupOptionsView', parse: true, out: 'engine' },
  { file: 'src/data/manifest.ts', name: 'ContentManifest', kind: 'type', cs: 'ContentManifest', parse: true, out: 'content' }
];

// C# reserved words that can appear as JSON keys.
const CS_KEYWORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked',
  'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else',
  'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for',
  'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock',
  'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params',
  'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short',
  'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual',
  'void', 'volatile', 'while'
]);

// ---------------------------------------------------------------------------
// Program setup
// ---------------------------------------------------------------------------

const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
if (!configPath) throw new Error('gen-unity-models: tsconfig.json not found');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
const program = ts.createProgram(parsedConfig.fileNames, {
  ...parsedConfig.options,
  noEmit: true
});
const checker = program.getTypeChecker();

function sourceFileFor(rel: string): ts.SourceFile {
  const abs = join(ROOT, rel).replace(/\\/g, '/');
  const sf = program.getSourceFiles().find(f => f.fileName.replace(/\\/g, '/') === abs);
  if (!sf) throw new Error(`gen-unity-models: source file not in program: ${rel}`);
  return sf;
}

function resolveRoot(spec: RootSpec): ts.Type {
  const sf = sourceFileFor(spec.file);
  for (const st of sf.statements) {
    if ((ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) && st.name.text === spec.name) {
      const sym = checker.getSymbolAtLocation(st.name);
      if (sym) return checker.getDeclaredTypeOfSymbol(sym);
    }
    if (spec.kind === 'return' && ts.isFunctionDeclaration(st) && st.name?.text === spec.name) {
      const sig = checker.getSignatureFromDeclaration(st);
      if (sig) return checker.getReturnTypeOfSignature(sig);
    }
  }
  throw new Error(`gen-unity-models: could not resolve ${spec.kind} "${spec.name}" in ${spec.file}`);
}

// ---------------------------------------------------------------------------
// Emission model
// ---------------------------------------------------------------------------

interface Field {
  csName: string;
  jsonName: string;
  csType: string;
  doc?: string;
}
interface CsClass {
  name: string;
  fields: Field[];
  parse: boolean;
  out: 'engine' | 'content';
  doc?: string;
}

const classes = new Map<string, CsClass>();
const enums = new Map<string, { values: string[]; out: 'engine' | 'content' }>();
const typeToName = new Map<ts.Type, string>();

function docOf(sym: ts.Symbol): string | undefined {
  const text = ts.displayPartsToString(sym.getDocumentationComment(checker)).trim();
  return text ? text.replace(/\s+/g, ' ') : undefined;
}

function isStringLiteralUnion(t: ts.Type): boolean {
  return t.isUnion() && t.types.every(x => !!(x.flags & ts.TypeFlags.StringLiteral));
}

function safeName(raw: string): { csName: string; jsonName: string } {
  if (CS_KEYWORDS.has(raw)) return { csName: '@' + raw, jsonName: raw };
  return { csName: raw, jsonName: raw };
}

function className(t: ts.Type, hintKey: string, fallback: string): string {
  const symName = t.aliasSymbol?.name ?? t.getSymbol()?.name;
  if (symName && symName !== '__type' && symName !== '__object') {
    return RENAME[symName] ?? symName;
  }
  return NAME_HINTS[hintKey] ?? fallback;
}

/** Map a resolved (non-nullable) TS type to a C# type name, queueing classes. */
function mapType(
  t: ts.Type,
  owner: string,
  propName: string,
  out: 'engine' | 'content',
  isArrayElement = false
): string {
  const hintKey = `${owner}.${propName}${isArrayElement ? '[]' : ''}`;

  // Opaque by contract (host must not inspect engine internals).
  const symName = t.aliasSymbol?.name ?? t.getSymbol()?.name;
  if (symName && OPAQUE[symName]) return OPAQUE[symName];

  // bool (TS boolean is internally true|false)
  if (t.flags & ts.TypeFlags.BooleanLike) return 'bool';

  // String-literal unions (CardKind, deck, stage, …) stay `string` on purpose.
  //
  // These are TRANSPORT types. The engine sends strings, and the Unity-side
  // enums (e.g. CandidateZero.Content.CardKind, which drives inspector fields
  // and tint tables) are a presentation concern owned by the Content layer.
  // Generating a second `CardKind` into HostData would collide with it on any
  // file that imports both namespaces, and would force enum round-tripping
  // into a boundary whose whole job is to stay loose. The importer parses
  // string -> its own enum, which is the correct direction of ownership.
  if (isStringLiteralUnion(t)) return 'string';

  if (t.flags & ts.TypeFlags.StringLike) return 'string';
  if (t.flags & ts.TypeFlags.NumberLike) {
    return FLOAT_FIELDS.has(propName) ? 'float' : 'int';
  }
  if (t.flags & ts.TypeFlags.Any || t.flags & ts.TypeFlags.Unknown) return 'JToken';

  // Arrays / tuples
  if (checker.isArrayType(t)) {
    const el = checker.getTypeArguments(t as ts.TypeReference)[0];
    return `List<${mapType(nonNull(el).type, owner, propName, out, true)}>`;
  }

  // Record<string, X> / index signatures -> Dictionary
  const strIndex = t.getStringIndexType();
  if (strIndex && t.getProperties().length === 0) {
    return `Dictionary<string, ${mapType(nonNull(strIndex).type, owner, propName, out, true)}>`;
  }

  // Object type -> class
  if (t.flags & ts.TypeFlags.Object || t.isIntersection()) {
    const existing = typeToName.get(t);
    if (existing) return existing;
    const fallback = capitalize(propName) + (out === 'content' ? 'Entry' : 'View');
    const name = className(t, hintKey, fallback);
    typeToName.set(t, name);
    if (!classes.has(name)) buildClass(name, t, out, false);
    return name;
  }

  // Anything unmodelled becomes raw JSON rather than a silent wrong type.
  return 'JToken';
}

function nonNull(t: ts.Type): { type: ts.Type; nullable: boolean } {
  const nn = checker.getNonNullableType(t);
  return { type: nn, nullable: nn !== t };
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function buildClass(name: string, type: ts.Type, out: 'engine' | 'content', parse: boolean, doc?: string): void {
  const cls: CsClass = { name, fields: [], parse, out, doc };
  classes.set(name, cls); // set first — guards against recursive types

  for (const prop of checker.getPropertiesOfType(type)) {
    const decl = prop.valueDeclaration ?? prop.declarations?.[0];
    const raw = decl
      ? checker.getTypeOfSymbolAtLocation(prop, decl)
      : checker.getTypeOfSymbol(prop);

    const { type: inner, nullable } = nonNull(raw);
    const optional = !!(prop.flags & ts.SymbolFlags.Optional);
    let csType = mapType(inner, name, prop.name, out);

    // Value types carry nullability explicitly; reference types are already nullable.
    const isValueType = ['int', 'float', 'bool'].includes(csType) || enums.has(csType);
    if ((nullable || optional) && isValueType) csType += '?';

    const { csName, jsonName } = safeName(prop.name);
    cls.fields.push({ csName, jsonName, csType, doc: docOf(prop) });
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

for (const spec of ROOTS) {
  const t = resolveRoot(spec);
  typeToName.set(t, spec.cs);
  buildClass(spec.cs, t, spec.out, !!spec.parse);
}

// ---------------------------------------------------------------------------
// Render C#
// ---------------------------------------------------------------------------

const HEADER = (what: string) => `// <auto-generated>
//     CANDIDATE ZERO — generated from the TypeScript engine types.
//     Source of truth: ${what}
//     Regenerate:  npm run gen:unity      Verify: npm run gen:unity:check
//
//     DO NOT EDIT BY HAND. Hand edits are overwritten and will fail CI.
//     To change a shape, change the TypeScript type and regenerate.
// </auto-generated>
`;

function renderField(f: Field): string {
  const doc = f.doc ? `        /// <summary>${escapeXml(f.doc)}</summary>\n` : '';
  const attr = f.csName.startsWith('@') ? `        [JsonProperty("${f.jsonName}")]\n` : '';
  return `${doc}${attr}        public ${f.csType} ${f.csName};`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderParse(name: string): string {
  return `
        /// <summary>Deserialize engine JSON. Never throws on shape drift — unknown members are ignored.</summary>
        public static ${name} Parse(string json)
        {
            if (string.IsNullOrEmpty(json)) return new ${name}();
            var settings = new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                MissingMemberHandling = MissingMemberHandling.Ignore
            };
            return JsonConvert.DeserializeObject<${name}>(json, settings) ?? new ${name}();
        }`;
}

function renderClass(cls: CsClass): string {
  const doc = cls.doc ? `    /// <summary>${escapeXml(cls.doc)}</summary>\n` : '';
  const body = cls.fields.map(renderField).join('\n');
  const parse = cls.parse ? '\n' + renderParse(cls.name) : '';
  const extra = EXTRA_MEMBERS[cls.name] ? '\n' + EXTRA_MEMBERS[cls.name] : '';
  return `${doc}    public sealed class ${cls.name}
    {
${body}${parse}${extra}
    }`;
}

function renderEnum(name: string, values: string[]): string {
  return `    public enum ${name}
    {
${values.map(v => `        ${v}`).join(',\n')}
    }`;
}

function renderFile(which: 'engine' | 'content', sourceDesc: string): string {
  const cls = [...classes.values()].filter(c => c.out === which);
  const ens = [...enums.entries()].filter(([, v]) => v.out === which);
  return `${HEADER(sourceDesc)}using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CandidateZero.HostData
{
${[
    ...ens.map(([n, v]) => renderEnum(n, v.values)),
    ...cls.map(renderClass)
  ].join('\n\n')}
}
`;
}

const outputs: { path: string; text: string }[] = [
  { path: join(OUT_DIR, 'EngineModels.g.cs'), text: renderFile('engine', 'src/engine/api.ts') },
  { path: join(OUT_DIR, 'ContentModels.g.cs'), text: renderFile('content', 'src/data/manifest.ts') }
];

if (CHECK_MODE) {
  let stale = false;
  for (const o of outputs) {
    const current = existsSync(o.path) ? readFileSync(o.path, 'utf8') : '';
    if (current.replace(/\r\n/g, '\n') !== o.text.replace(/\r\n/g, '\n')) {
      console.error(`STALE: ${o.path.replace(ROOT, '.')}`);
      stale = true;
    }
  }
  if (stale) {
    console.error('\ngen:unity:check FAILED — generated C# does not match the TypeScript types.');
    console.error('Run `npm run gen:unity` and commit the result.');
    process.exit(1);
  }
  console.log('gen:unity:check OK — C# models match the TypeScript engine types.');
} else {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const o of outputs) {
    writeFileSync(o.path, o.text);
    console.log(`generated ${o.path.replace(ROOT, '.')}`);
  }
  const clsCount = classes.size;
  const enCount = enums.size;
  const fieldCount = [...classes.values()].reduce((n, c) => n + c.fields.length, 0);
  console.log(`  ${clsCount} classes · ${enCount} enums · ${fieldCount} fields — all derived from TS`);
}
