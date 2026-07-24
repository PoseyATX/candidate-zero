// Candidate Zero — Engine bridge (Jint)
// Rules live only in the TS bundle. Unity never reimplements odds/yields.
// Contract: docs/ENGINE-API.md
using System;
// Always qualify Jint.Engine — a bare `Engine` can collide with other names.
using Jint;

namespace CandidateZero.Runtime
{
    public interface IEngineBridge
    {
        string NewGame(int seed, string setupJson = null);
        string View(string snapshotJson);
        string Apply(string snapshotJson, string commandJson);
        string SetupOptions();
        string Serialize(string snapshotJson);
        string Deserialize(string saveText);
    }

    public sealed class EngineBridge : IEngineBridge
    {
        private readonly Jint.Engine _js;

        public EngineBridge(string bundleSource)
        {
            if (string.IsNullOrEmpty(bundleSource))
                throw new ArgumentNullException(nameof(bundleSource));

            _js = new Jint.Engine(options => options
                .LimitRecursion(8000)
                .TimeoutInterval(TimeSpan.FromSeconds(30)));

            _js.Execute(bundleSource);
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

        /// <summary>Opaque save string (engine serialize).</summary>
        public string Serialize(string snapshotJson) =>
            Eval($"CandidateZeroEngine.serialize({snapshotJson})");

        /// <summary>Restore snapshot JSON from serialize() output.</summary>
        public string Deserialize(string saveText)
        {
            // Pass save as a JS string literal (escape carefully).
            var escaped = EscapeJsString(saveText);
            return Eval($"JSON.stringify(CandidateZeroEngine.deserialize({escaped}))");
        }

        private static string EscapeJsString(string s)
        {
            if (s == null) return "\"\"";
            return "\"" + s
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n")
                .Replace("\t", "\\t") + "\"";
        }

        private string Eval(string expression)
        {
            try
            {
                return _js.Evaluate(expression).AsString();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    "EngineBridge JS eval failed: " + ex.Message +
                    "\nExpression head: " +
                    (expression.Length > 200 ? expression.Substring(0, 200) + "…" : expression),
                    ex);
            }
        }
    }
}
