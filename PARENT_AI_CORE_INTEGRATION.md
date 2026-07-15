# Parent AI Core Integration

The Parent AI system now has one shared core:

- `parent-ai-core/data.js`: topics, standards, parent styles, task definitions.
- `parent-ai-core/harmfulResponses.js`: harmful/caution signal rules and parent reaction helpers.
- `parent-ai-core/session.js`: browser-safe session creation, triggered-event detection, turn payloads, session updates, and test reply samples.
- `parent-ai-core/agentEnsemble.mjs`: Node-only real model evaluator using three evaluator/reply agents plus an aggregator.

Current call graph:

```text
Standalone sandbox UI
  -> parent-ai-core data/session/rules
  -> parent-ai-sandbox/server.mjs
  -> parent-ai-core/agentEnsemble.mjs

Game OfficeScene
  -> parent-ai-core session helpers
  -> src/services/parentAiClient.js
  -> parent-ai-sandbox/server.mjs
  -> parent-ai-core/agentEnsemble.mjs
```

Game behavior:

- A parent conversation is created from a stored choice outcome, not from an event title alone.
- Each stored outcome carries `eventId`, `choiceId`, `choiceLabel`, `informationSource`, `parentMessage`, `communicationFocus`, and source `keyLines`.
- Each outcome has its own session. Completing one outcome does not complete another event from the same week.

- Week 1 `toyRoom/tidyToys` marks `xiaoming_dinosaur`.
- Week 1 `outdoorYard/observeLight` marks `xiaoli_sunlight`.
- Week 2 `toyRoom/observePreference` marks `week2_toy_preference`.
- Week 2 `outdoorYard/sandpit` marks `week2_sandpit_parallel_play`.
- Week 3 `library/readPictureBook` marks `week3_picture_book_emotion`.
- Week 3 `sensoryRoom/structuredMovement` marks `week3_structured_movement`.
- Week 4 `paintingRoom/charityExhibition` marks `week4_charity_exhibition`.
- Week 4 `activityRoom/interactGroup` marks `week4_group_interaction`.
- Week 5 `toyRoom/blocksPuzzle` marks `week5_blocks_puzzle_prompting`.
- Week 6 `diningRoom/observeMeal` marks `week6_meal_sensory`.
- Week 7 `activityRoom/observeChildren` marks `week7_final_observation`.
- Week 5 `outdoorYard/physicalTraining` and Week 7 `sensoryRoom/physicalTraining` are player self-regulation scenes, so they do not create parent conversations.
- Each pending outcome appears as a separate parent contact in `OfficeScene.showParentCommunicationMenu()`.
- If no special event is pending, the original daily talk / complaint contacts remain the fallback.

The first in-game adapter is option-based because `ParentChatPanel` currently has button replies rather than free text input. The shared session/API layer is already independent, so a later free-text UI only needs to call the same `requestParentAiTurn({ session, playerReply })`.
