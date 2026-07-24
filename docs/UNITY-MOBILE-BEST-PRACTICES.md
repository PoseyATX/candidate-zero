# Unity mobile best practices (on-site sources)

This host follows **Unity’s own docs and mobile guidance**, not ad-hoc patterns.
When optimizing further, prefer these sources over blog folklore.

## Official references (use first)

| Topic | Unity resource |
|-------|----------------|
| Multi-resolution UI | [Designing UI for Multiple Resolutions](https://docs.unity3d.com/Packages/com.unity.ugui@1.0/manual/HOWTO-UIMultiResolution.html) |
| Canvas Scaler | [Canvas Scaler](https://docs.unity3d.com/Manual/script-CanvasScaler.html) |
| Canvas modes | [Canvas](https://docs.unity3d.com/Manual/UICanvas.html) — Screen Space Overlay at hierarchy root |
| Safe area / notches | [Screen.safeArea](https://docs.unity3d.com/ScriptReference/Screen-safeArea.html) · [uGUI Safe Area](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-SafeArea.html) |
| Mobile optimization | [Practical guide to optimization for mobiles](https://docs.unity3d.com/Manual/MobileOptimizationPracticalGuide.html) |
| Mobile performance e-book | [Optimize your mobile game performance](https://resources.unity.com/games/unity-e-book-optimize-your-mobile-game-performance) · [unity.com blog series](https://unity.com/blog/games/optimize-your-mobile-game-performance-tips-on-profiling-memory-and-code-architecture-from) |
| Best practice guides index | [docs.unity3d.com/Manual/best-practice-guides.html](https://docs.unity3d.com/Manual/best-practice-guides.html) |
| Learn pathways | [learn.unity.com](https://learn.unity.com/) — *Ship your first mobile game* |
| Profile | Unity Profiler + **profile on device** (e-book tip #1) |

## What we implement in this project

| Practice | Where |
|----------|--------|
| **Scale With Screen Size**, reference **1080×1920 (9:16)** | `MobileLayout.ConfigureScaler` |
| **Match ≈ height** for portrait-first (docs Match property) | `matchWidthOrHeight = 0.75` |
| **Screen.safeArea** for notches / home indicator | `SafeAreaDriver` |
| **9:16 letterbox** on wide desktops (same layout, not a second UI) | `SafeAreaDriver` |
| **Pool hand cards** (SetActive recycle; no Destroy churn) | `CardTilePool` |
| **raycastTarget = false** on pure text | `CardTableHud` labels |
| **SetActive** for hide (not alpha 0) | overlays, pool |
| **targetFrameRate = 60**, vSync 0 on mobile | `MobileBootstrap` |
| **sleepTimeout NeverSleep** while playing | `MobileBootstrap` |
| **Portrait** default orientation | ProjectSettings |
| Engine rules stay off the main thread of UI layout | Jint apply only on input |

## Product constraints (Candidate Zero)

- **Primary players:** mobile portrait **9:16**.
- **Desktop 16:9:** acceptable via letterboxed phone column — not a separate desktop redesign.
- **Rules:** pure TypeScript via Jint — never reimplement odds in C#.

## Do next (Unity-recommended, not yet done)

1. **Profile on a real phone** (Unity Profiler + Frame Debugger) before micro-optimizing.
2. **TextMesh Pro** for body text if glyph quality becomes an issue (uGUI path still valid).
3. **Sprite Atlas** for card art when art ships ([2D atlas best practices](https://docs.unity3d.com/Manual/SpriteAtlasWorkflow.html)).
4. **Addressables** for large art packs when catalog grows (*Ship your first mobile game* pathway).
5. Consider **UI Toolkit** only if/when a full UI rewrite is justified — uGUI remains fully supported for this product stage.

## Game view preview

Unity Editor → Game view aspect → **1080x1920** or custom **9:16** to match design resolution from the multi-resolution how-to.
