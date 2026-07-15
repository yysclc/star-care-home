import {
  handleOptions,
  handleStatus,
} from '../_shared/parentAiRuntime.js';

export function onRequestGet(context) {
  return handleStatus(context);
}

export function onRequestOptions() {
  return handleOptions();
}
