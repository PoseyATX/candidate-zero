/**
 * CANDIDATE ZERO — engine bundle fallback builder (no native toolchain needed)
 * ===========================================================================
 * `npm run build:engine` (vite/rolldown) is the normal path and stays the
 * normal path. It needs platform-native binaries, so it cannot run when the
 * checkout's node_modules was installed for a different OS (e.g. a Windows
 * install being driven from a Linux shell).
 *
 * This produces the SAME artifact using only TypeScript's own emitter:
 *   tsc --module system --outFile   ->  one System.register bundle
 *   + a ~40-line synchronous System loader shim
 *   = var CandidateZeroEngine = {...}   (the IIFE global Jint evaluates)
 *
 * Output is byte-for-byte functionally equivalent, just unminified. Prefer
 * `npm run build:engine` when you can run it; use this when you can't.
 *
 * Usage: node scripts/build-engine-fallback.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GLOBAL_NAME = 'CandidateZeroEngine';
const OUT = join(ROOT, 'unity', 'engine', 'candidate-zero-engine.js');

const work = join(tmpdir(), 'cz-engine-fallback');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const sysFile = join(work, 'system.js');

console.log('tsc --module system → System.register bundle …');
execFileSync(
  process.execPath,
  [
    join(ROOT, 'node_modules', 'typescript', 'lib', 'tsc.js'),
    join(ROOT, 'src', 'engine', 'api.ts'),
    '--outFile', sysFile,
    '--module', 'system',
    '--target', 'es2019',      // matches vite.engine.config.ts — keeps ?. / ?? out for Jint
    '--moduleResolution', 'node',
    '--allowSyntheticDefaultImports',
    '--esModuleInterop',
    '--skipLibCheck'
  ],
  { stdio: 'inherit', cwd: ROOT }
);

const body = readFileSync(sysFile, 'utf8');

// tsc roots module ids at its inferred rootDir (so "engine/api", not
// "src/engine/api") and emits in dependency order — the entry registers last.
// Derive it rather than hardcoding, so this can't silently rot.
const ids = [...body.matchAll(/System\.register\("([^"]+)"/g)].map(m => m[1]);
if (ids.length === 0) throw new Error('build-engine-fallback: no System.register modules emitted');
const ENTRY_MODULE = ids[ids.length - 1];
if (!/(^|\/)engine\/api$/.test(ENTRY_MODULE)) {
  throw new Error(`build-engine-fallback: unexpected entry module "${ENTRY_MODULE}" (expected engine/api)`);
}
console.log(`  ${ids.length} modules · entry = ${ENTRY_MODULE}`);

// Minimal synchronous System.register loader. The bundle registers every
// module up front, so we can resolve the graph in dependency order and then
// hand back the entry module's exports as a plain object.
const shim = `var ${GLOBAL_NAME} = (function () {
  "use strict";
  var __defs = {};            // name -> { deps, decl }
  var __mods = {};            // name -> exports object
  var __loading = {};
  var System = {
    register: function (name, deps, decl) { __defs[name] = { deps: deps, decl: decl }; }
  };

  function __require(name) {
    if (Object.prototype.hasOwnProperty.call(__mods, name)) return __mods[name];
    var def = __defs[name];
    if (!def) throw new Error("candidate-zero: module not found: " + name);
    // Circular-import guard: publish the (initially empty) namespace first.
    if (__loading[name]) return __mods[name] || (__mods[name] = {});
    __loading[name] = true;

    var exports = __mods[name] || (__mods[name] = {});
    var setters = [];
    var execute = null;

    var ctx = {
      id: name,
      import: function (dep) { return Promise.resolve(__require(__resolve(name, dep))); },
      meta: { url: name }
    };
    var mod = def.decl(function (key, value) {
      if (typeof key === "object") {
        for (var k in key) if (Object.prototype.hasOwnProperty.call(key, k)) exports[k] = key[k];
      } else {
        exports[key] = value;
      }
      return value;
    }, ctx);

    setters = mod.setters || [];
    execute = mod.execute;

    for (var i = 0; i < def.deps.length; i++) {
      var depName = __resolve(name, def.deps[i]);
      var depExports = __require(depName);
      if (setters[i]) setters[i](depExports);
    }
    if (execute) execute();
    __loading[name] = false;
    return exports;
  }

  // tsc emits module ids already relative to the project root, and dependency
  // specifiers as written in source ("./loop.js", "../data/setup.js"). Resolve
  // them against the importing module's directory, dropping the .js the
  // TypeScript ESM style requires.
  function __resolve(from, spec) {
    if (spec.charAt(0) !== ".") return spec;
    var base = from.split("/");
    base.pop();
    var parts = spec.replace(/\\.js$/, "").split("/");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === "." || p === "") continue;
      if (p === "..") base.pop();
      else base.push(p);
    }
    return base.join("/");
  }

${body.replace(/^/gm, '  ')}

  var __entry = __require(${JSON.stringify(ENTRY_MODULE)});
  var out = {};
  for (var k in __entry) if (Object.prototype.hasOwnProperty.call(__entry, k)) out[k] = __entry[k];
  return out;
})();
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, shim);
console.log(`engine bundle -> ${OUT.replace(ROOT, '.')} (${(shim.length / 1024).toFixed(0)} KB)`);
