# MCP production-origin browser gate — 2026-11-01

Status: **FAILED / core implementation remains gated**. This records a real Codex internal-browser experiment, not a localhost substitute. No MCP task operations were implemented or advertised.

## Environment and published prerequisite

- Production origin: `https://seraflab.github.io`, document `/tracker/mcp-transport-probe.html`.
- Prerequisite PR20: merged `5159b6b`, deployment and smoke succeeded. PR21 fixes service-worker navigation fallback for this concrete document, merged `395f19e`; deployment and smoke succeeded.
- The existing browser accepted EasyTrack's ordinary **Update** action. Browser storage and the service worker were not cleared or unregistered.
- Browser-reported user agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36`. The host application version was not exposed by the available browser APIs.
- Local Node `24.21.0`, `ws` `8.22.1`. Relay binds only `127.0.0.1`, uses an ephemeral port/token, exact Origin/Host/path checks and a 15-minute lifetime.

## Observed results

1. The actual published HTTPS document loaded in the same IAB context, removed its bootstrap fragment, and reported `secure: true`, the production origin, and IndexedDB `storage: ready`.
2. **Test connection** was activated in a hidden tab, then repeated in a visible tab with a fresh relay session. Both reported `Local connection failed; handshake not confirmed`, `handshake: false`, close code `1006`.
3. No browser permission prompt was exposed in the accessibility state or screenshot. Console warning/error collection returned no entries. This evidence does not identify the precise browser policy responsible.
4. Direct navigation to the relay's HTTP loopback address returned the relay's `Upgrade Required` response. The local process was reachable from IAB over HTTP.
5. A final isolated relay copy added sanitized HTTP-upgrade diagnostics without weakening any check. The production-page WebSocket attempt never reached its `verifyClient` handler; no upgrade attempt was recorded. This rules out rejection by the relay's token/Origin/Host validation for that observed attempt.
6. Consequently there was no authenticated handshake, no background command, and no marker write to verify across reopening. Task 1.2 is also unfulfilled. Local Playwright regressions pass but do not change this production result.

## Browser-tool workflow and limits

`cua.createBrowserTab('2', url, { visible: false/true })` opened hidden and visible internal tabs; `getAXState`, native `click`, `getAXStateAndScreenshot`, and the visibility capability supported inspection and ordinary app update. Old tab bindings from an earlier user turn were stale and were replaced with newly created tabs in the same browser. No external browser or alternate storage origin was substituted.

The browser offers document-bound WebMCP discovery, but this diagnostic document has no registered tools. Whether a native page-tool alternative can satisfy a revised integration contract requires a separate feasibility test and a product decision; it is not evidence that stdio MCP or WebMCP integration is working.

## Next decision

The existing design explicitly requires a successful production handshake before core MCP implementation. Keep the change active and stop dependent groups 2–6 until the transport is revised with the user or the existing path demonstrably works. Do not mark the gate complete, replace it with localhost evidence, disable browser security, or claim a task was saved through MCP.
