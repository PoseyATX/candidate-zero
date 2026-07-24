// Object pool for hand card tiles — Unity best practice: pool recurring elements
// rather than Instantiate/Destroy every paint.
// (Same principle as UI Toolkit ListView recycling / uGUI manual pooling.)
using System.Collections.Generic;
using UnityEngine;

namespace CandidateZero.UI
{
    public sealed class CardTilePool
    {
        private readonly Transform _parent;
        private readonly Stack<GameObject> _free = new Stack<GameObject>();
        private readonly List<GameObject> _active = new List<GameObject>();

        public CardTilePool(Transform parent)
        {
            _parent = parent;
        }

        public IReadOnlyList<GameObject> Active => _active;

        public GameObject Rent(string name)
        {
            GameObject go;
            if (_free.Count > 0)
            {
                go = _free.Pop();
                go.name = name;
                go.SetActive(true);
            }
            else
            {
                go = new GameObject(name, typeof(RectTransform));
                go.transform.SetParent(_parent, false);
            }
            _active.Add(go);
            return go;
        }

        /// <summary>Return all active tiles to the pool (SetActive false — not Destroy).</summary>
        public void ReleaseAll()
        {
            for (var i = 0; i < _active.Count; i++)
            {
                var go = _active[i];
                if (go == null) continue;
                // Clear button listeners before reuse
                var btn = go.GetComponent<UnityEngine.UI.Button>();
                if (btn != null) btn.onClick.RemoveAllListeners();
                go.SetActive(false);
                go.transform.SetParent(_parent, false);
                _free.Push(go);
            }
            _active.Clear();
        }

        public void ClearDestroy()
        {
            ReleaseAll();
            while (_free.Count > 0)
            {
                var go = _free.Pop();
                if (go != null) Object.Destroy(go);
            }
        }
    }
}
