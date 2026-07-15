import {
  handleOptions,
  handleParentAiStart,
} from '../../_shared/parentAiRuntime.js';

export function onRequestPost(context) {
  return handleParentAiStart(context);
}

export function onRequestOptions() {
  return handleOptions();
}
