// Decides which unread emails deserve to become tasks. The Gmail query
// already narrows to the Primary tab, but plenty of automated mail lands
// there too — this is the second sieve.
//
// Philosophy: a task is something a *person* is waiting on you for. So the
// filter drops machine mail on three signals, strongest first:
//   1. a List-Unsubscribe header — the definitive bulk-mail marker
//   2. an automated sender address (no-reply@, notifications@, billing@, …)
//   3. a transactional/marketing subject (receipts, codes, sales, alerts)
// Anything that survives is probably a human writing to you, which is
// exactly the mail that tends to carry obligations.
//
// Kept deliberately out of the noise lists: "reminder", "due", "deadline",
// "action required" — those are the tasks.

const NOISE_SENDER =
  /no-?reply|do-?not-?reply|notifications?@|newsletter|mailer|mailchimp|updates@|digest|automated|alerts?@|billing@|receipts?@|marketing@|news@|promo|surveys?@|feedback@|hello@|support@|team@|info@/i

const NOISE_SUBJECT =
  /\bunsubscribe\b|newsletter|digest|receipt|your order|order (confirmed?|update)|has shipped|out for delivery|was delivered|verification code|verify your|confirm your (email|account)|password reset|security alert|new sign-?in|sign-?in attempt|welcome to|free trial|% off|\bsale\b|\bdiscount\b|deal of|webinar|take our .{0,24}survey|invoice|payment (received|confirmation)|statement is (ready|available)|renews|auto-?pay|terms of service|privacy policy|new login|weekly summary|monthly summary/i

export function looksLikeTask({ subject = '', from = '', hasUnsubscribe = false }) {
  if (hasUnsubscribe) return false
  if (NOISE_SENDER.test(from)) return false
  if (NOISE_SUBJECT.test(subject)) return false
  return true
}
