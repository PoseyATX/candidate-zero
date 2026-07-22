// Candidate Zero — Engine bridge (reference stub)
// -------------------------------------------------------------------------
// The runtime half of the Unity binding: Unity calls the pure TypeScript
// rules engine and NEVER reimplements a rule. The engine ships as a
// standalone JS bundle (dist-engine/candidate-zero-engine.umd.cjs, built by
// `npm run build:engine`) that exposes a `CandidateZeroEngine` global. Load
// it in an embedded JS runtime (ClearScript, Jint, or Puerts) and marshal
// snapshots/commands as JSON. Full contract: docs/ENGINE-API.md.
//
// This is a shape/reference stub — the concrete JS-runtime call is left to
// the project's chosen host (there are several viable ones). Fill in
// Eval(...) with your runtime; everything else is the stable protocol.
// -------------------------------------------------------------------------
using System;
using UnityEngine;

namespace CandidateZero.Runtime
{
    /// <summary>
    /// Stateless facade over the JS engine bundle. A "snapshot" is opaque
    /// JSON — Unity persists it to save, never inspects rules inside it.
    /// </summary>
    public interface IEngineBridge
    {
        /// newGame({ seed, setup }) -> snapshot json
        string NewGame(int seed, string setupJson = null);

        /// view(snapshot) -> render-model json (ledger, actions, grounds, log)
        string View(string snapshotJson);

        /// apply(snapshot, command) -> { snapshot, ok, reason, events } json
        string Apply(string snapshotJson, string commandJson);

        /// setupOptions() -> persona/issue/district/region choices json
        string SetupOptions();
    }

    /// <summary>
    /// Example wiring. Replace Eval() with your embedded JS runtime call.
    /// The engine is deterministic: (seed + command log) reproduces state
    /// exactly, and serialize/deserialize is lossless (docs/ENGINE-API.md).
    /// </summary>
    public sealed class EngineBridge : IEngineBridge
    {
        // TODO: hold your JS runtime + the loaded CandidateZeroEngine global.
        private Func<string, string> _eval;

        public EngineBridge(Func<string, string> evalJsExpression)
        {
            _eval = evalJsExpression ?? throw new ArgumentNullException(nameof(evalJsExpression));
        }

        public string NewGame(int seed, string setupJson = null)
        {
            var arg = setupJson == null
                ? $"{{ seed: {seed} }}"
                : $"{{ seed: {seed}, setup: {setupJson} }}";
            return _eval($"JSON.stringify(CandidateZeroEngine.newGame({arg}))");
        }

        public string View(string snapshotJson) =>
            _eval($"JSON.stringify(CandidateZeroEngine.view({snapshotJson}))");

        public string Apply(string snapshotJson, string commandJson) =>
            _eval($"JSON.stringify(CandidateZeroEngine.apply({snapshotJson}, {commandJson}))");

        public string SetupOptions() =>
            _eval("JSON.stringify(CandidateZeroEngine.setupOptions())");
    }
}
