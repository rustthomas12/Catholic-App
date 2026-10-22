// Errors raised on purpose by our database (RAISE ... ERRCODE 'P0001') carry
// a message written for members, e.g. the language filter. Show those as-is;
// anything else gets the caller's generic fallback.
export function friendlyError(error, fallback) {
  return error?.code === 'P0001' && error.message ? error.message : fallback
}
