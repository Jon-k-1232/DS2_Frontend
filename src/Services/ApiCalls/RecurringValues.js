export const recurringError = e => e.response?.data?.message || e.message || 'Unable to save recurring billing. Please retry.';
export function retryKey(ref, body) {
  const hash = JSON.stringify(body);
  if (ref.current?.hash !== hash) ref.current = { hash, key: crypto.randomUUID() };
  return ref.current.key;
}
