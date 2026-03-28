let sequence = 1;

export function nextSubscriptionId() {
  return String(sequence++);
}
