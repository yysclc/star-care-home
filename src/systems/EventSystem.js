export function evaluateDayEnd(gs, hasUnhandledComplaint = false) {
  return {
    hasUnhandledComplaint,
    dialogKey: hasUnhandledComplaint
      ? 'result.unhandledComplaint'
      : 'result.noUnhandledComplaint',
  };
}
