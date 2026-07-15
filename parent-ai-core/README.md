# Parent AI Core

Shared Parent AI module used by both surfaces:

- `parent-ai-sandbox`: standalone test UI and real-model playtest harness.
- `src/scenes/OfficeScene.js`: in-game parent communication contact.

The browser-safe entry is `index.js`. It exports topic data, harmful response rules, session creation, turn payload building, session updates, trigger detection, and sample replies.

The Node-only evaluator is `agentEnsemble.mjs`. It calls the configured model provider with the architecture requested for playtests: one player agent when generating playtest input, three evaluator/reply agents, and a conservative aggregator.

The game should not import `agentEnsemble.mjs` directly. It sends `session + playerReply` to the sandbox API, and the API calls the evaluator.

Formal event conversations require a stored choice outcome. Event ids or titles alone are insufficient and fall back to the original parent topics. Real-model playtests must pass `eventOutcomes`; the harness rejects title-only cases.
