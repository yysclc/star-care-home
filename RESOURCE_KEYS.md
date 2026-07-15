# Resource Key Index

This project uses Phaser texture/audio keys as the stable asset contract.
All direct image/audio queueing should go through `ResourceManager` so package loading and scene fallback loading cannot race each other.

## Core Packs

| Pack | Purpose | Keys |
| --- | --- | --- |
| `common` | Shared UI, map, room backgrounds, portraits, basic SFX | `mapBg`, `activityPlaceholder`, `fixedPhaseBg`, `resultBg`, `bgActivityRoom`, `bgActivityRoomWithOrange`, `bgToyRoom`, `bgOutdoorYard`, `bgOutdoorYardWithOrange`, `bgPaintingRoom`, `bgPaintingRoomWithOrange`, `bgLibrary`, `bgSensoryRoom`, `portrait_chenlan`, `portrait_chengcheng`, `portrait_chengchengdad`, `portrait_zhoujianing`, `portrait_player_female`, `portrait_player_male`, `sfx_click`, `sfx_dialog_next` |
| `bgm` | Music | `title_bgm`, `daily_bgm`, `story_soft_bgm`, `pressure_bgm`, `minigame_bgm`, `ending_bgm` |
| `prologue` | Opening and prologue | `startBg`, `bedroom`, `bedroom2` |

## Minigame Packs

| Pack | Keys |
| --- | --- |
| `minigameActivityStep` | `step_card_01`, `step_card_02`, `step_card_03`, `step_card_04` |
| `minigameOutdoorAac` | `aac_water`, `aac_loud`, `aac_rest`, `aac_help` |
| `minigameToyRoom` | `toyRoomSprites` |
| `minigameSensoryBalance` | `sensoryChildBalance`, `sensoryBeamTop`, `sensoryBeamBase` |

## Weekly Story Packs

| Pack | Keys |
| --- | --- |
| `week1` | `officeBg`, `chapter1_office_corridor`, `chapter1_activity_room`, `chapter1_office`, `table_art`, `chenlan_old_photo` |
| `week2` | `no_sound_art` |
| `week3` | `chengcheng_effort_cg`, `two_colors_art` |
| `week4` | `back_art` |
| `week5` | `two_chairs_art`, `parent_cg` |
| `week6` | `sensory_cg` |
| `week7` | `door_person_boy_art`, `door_person_girl_art`, `second_person_art` |
| `ending` | `result_empty`, `activityroom_empty`, `result_badend`, `corridor_new`, `reputation_end_cg`, `communication_end_cg`, `chengcheng_end_cg`, `last_end_cg` |

## Marker Rules

- `__BG:key__` should reference a key in `RESOURCE_PACKS`, except `black`.
- `__COLLECT:key__` should reference an item id in `COLLECTIONS_DATA` and the same texture key in `RESOURCE_PACKS`.
- `__PORTRAIT:char:side__` maps through `StoryPortraitController`; portrait textures use `portrait_*` keys.
- New scene fallback loads should use `ResourceManager.queueImage(scene, key, path)` or `ResourceManager.queueAudio(scene, key, path)`.
