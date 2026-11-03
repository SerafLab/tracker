# Internal-browser binding

Use a host exposing both internal tab control and native document WebMCP discovery/execution. Support for ordinary MCP servers alone is insufficient. Follow the host's current tool initialization and documentation before running examples. Never inject JavaScript to call `document.modelContext` through a read-only evaluation surface.

For Codex IAB, after obtaining the user-selected/known tab through the documented browser tool, the native surface has this shape:

```javascript
const webmcp = await tab.capabilities.get('webmcp');
let discovered = await webmcp.fetchTools();
nodeRepl.write(discovered.description());
// Choose get_connection's exact name from this description, including its suffix.
// Call discovered.call(actualListedName, {}) and inspect the returned envelope.
```

`actualListedName` must be the name returned for this tab, not text copied from an example. Do not assume global tool discovery names are interchangeable with document-local handles. In Codex IAB, call `fetchTools` before the first WebMCP call on each tab in every turn, even if the document has not navigated; handles can expire between turns. Reuse the discovered object only during that turn while it remains valid, and refresh after navigation/tool-change/stale-handle notifications. This per-turn rule describes Codex IAB; follow the current documentation of another host rather than assuming the same lifetime there.

When there is no suitable app tab, create an internal tab at `https://seraflab.github.io/tracker/` with the host's documented unshown option if supported. For example, the documented CUA surface may provide `cua.createBrowserTab('iab', appUrl, {visible:false})`. First inspect the browser/tab inventory and retain the actual browser/tab identifiers; do not reacquire a different browser to work around a tab failure. A visible-only host can still be used, with its limitation reported.

To show the selected workspace, first complete `show_workspace` on the bound document. Then select that same tab and use the host's documented visibility capability, such as `await (await browser.capabilities.get('visibility')).set(true)` where available. Follow the actual host API for selecting the pinned tab before changing browser-wide visibility; showing some other selected tab is not success. Verify the visible page/route through the supported observation API. Do not create a second context to display a copy.

If the tab must survive the current turn for the user, use the host's documented deliverable/handoff lifecycle operation. This preserves a tab, not its session across reload. A `browserShown:false` result and `document.visibilityState:'visible'` only establish unshown-panel execution. Record hidden/unloaded/closed-document execution as unsupported or unverified unless actually demonstrated in that host.

If native tools, internal navigation or visibility control are missing, explain exactly which capability is absent. Keep the selected origin and storage context; do not install extensions, change security settings, start a relay, silently register stdio MCP or create a new user chat.

An explicit model-does-not-support-webmcp_list_tools error means this chat's model lacks native discovery, even if the app page loads. Report that model capability limitation and let the user select a compatible model; do not substitute DOM CRUD or another transport. The [official Site tools release guidance](https://learn.chatgpt.com/docs/changelog?date=2026-09-03&index=2) names GPT-5.6 Sol/Terra and excludes GPT-5.6 Luna. Rebind with fresh tools/session after the user continues on a compatible model.
