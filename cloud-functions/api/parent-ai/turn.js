import {
  handleOptions,
  handleParentAiTurn,
} from '../../_shared/parentAiRuntime.js';

export function onRequestPost(context) {
  return handleParentAiTurn(context);
}

export function onRequestOptions() {
  return handleOptions();
}
