# Native WebMCP feasibility experiment

This page tests the user's selected alternative after the production-origin loopback WebSocket gate failed. It registers tools with the native `document.modelContext.registerTool` API and exposes only echo/store/read operations for a synthetic marker in a separate `easytrack-webmcp-experiment` IndexedDB database. It never reads or writes EasyTrack projects/cards.

The actual Codex IAB on 2026-11-02 discovered all three registrations, executed echo and storage, and read the marker from a newly opened document after the original tab closed on a local secure context. An invocation completed while the browser visibility capability remained false. The document still reported `visibilityState: visible`, so this proves an unshown browser invocation, not execution in a document reported as hidden.

The next gate repeats native discovery, execution, storage continuity and unshown invocation at the unchanged production origin. This experiment does not implement stdio MCP or revise the feature's approved public contract. Record production results before deciding on that revision.

Automated tests use an explicitly named model-context fixture to validate the page's registration lifecycle, schemas, marker persistence, unsupported state and installed-worker navigation. Those tests do not establish native WebMCP support; actual native IAB calls do. No browser flags, security settings, global MCP configuration or origin-trial credentials are changed.

Primary API reference: https://developer.chrome.com/docs/ai/webmcp/imperative-api
