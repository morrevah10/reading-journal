// Firebase errors carry a code such as "auth/popup-blocked". It is shown next to the message
// so a failure on a device (e.g. the phone) can be diagnosed from what the user sees.
export function authErrorCode(error) {
  if (typeof error?.code === 'string' && error.code) return error.code;
  if (typeof error?.name === 'string' && error.name && error.name !== 'Error') return error.name;
  return 'unknown';
}
