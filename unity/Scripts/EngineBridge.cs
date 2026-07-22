// Candidate Zero — Engine bridge (Jint)
// -------------------------------------------------------------------------
// The runtime half of the Unity binding: Unity calls the pure TypeScript
// rules engine and NEVER reimplements a rule. The engine ships as a
// standalone JS bundle (unity/engine/candidate-zero-engine.js, built by
// `npm run build:engine`, targeted es2019 for Jint) that defines a global
// `CandidateZeroEngine`. This runs it in Jint — a pure-C# JS interpreter,
// so there are no native libraries and the iOS/IL2CPP path stays clean.
// Full contract: docs/ENGINE-API.md · setup: docs/UNITY-SETUP.md.
//
// Add Jint to the Unity project via NuGetForUnity (package id: "Jint") or
// by dropping Jint.dll into Assets/Plugins. A game is turn-based, so the
// interpreter's speed is a non-issue.
// -------------------------------------------------------------------------
using System;
using Jint;

namespace CandidateZero.Runtime
{
    /// <summary>
    /// Stateless facade over the JS engine bundle. A "snapshot" is opaque
    /// JSON — Unity persists it to save a game, never inspects rules inside.
    /// Determinism: (seed + command log) reproduces state exactly, and
    /// serialize/deserialize is lossless (docs/ENGINE-API.md, harness:api).
    /// </summary>
    public interface IEngineBridge
    {
        string NewGame(int seed, string setupJson = null);
        string View(string snapshotJson);
        string Apply(string snapshotJson, string commandJson);
        string SetupOptions();
    }

    public sealed class EngineBridge : IEngineBridge
    {
        private readonly Engine _js;

        /// <param name="bundleSource">
        /// Contents of unity/engine/candidate-zero-engine.js (import it as a
        /// TextAsset — e.g. rename to .txt/.bytes so Unity doesn't treat the
        /// .js as script). Evaluated once to define CandidateZeroEngine.
        /// </param>
        public EngineBridge(string bundleSource)
        {
            if (string.IsNullOrEmpty(bundleSource))
                throw new ArgumentNullException(nameof(bundleSource));

            _js = new Engine(options => options
                .LimitRecursion(4000)
                .TimeoutInterval(TimeSpan.FromSeconds(5)));

            _js.Execute(bundleSource); // defines the global CandidateZeroEngine
        }

        public string NewGame(int seed, string setupJson = null)
        {
            var arg = string.IsNullOrEmpty(setupJson)
                ? $"{{ seed: {seed} }}"
                : $"{{ seed: {seed}, setup: {setupJson} }}";
            return Eval($"JSON.stringify(CandidateZeroEngine.newGame({arg}))");
        }

        public string View(string snapshotJson) =>
            Eval($"JSON.stringify(CandidateZeroEngine.view({snapshotJson}))");

        public string Apply(string snapshotJson, string commandJson) =>
            Eval($"JSON.stringify(CandidateZeroEngine.apply({snapshotJson}, {commandJson}))");

        public string SetupOptions() =>
            Eval("JSON.stringify(CandidateZeroEngine.setupOptions())");

        private string Eval(string expression) => _js.Evaluate(expression).AsString();
    }
}
