// Decides which unread emails deserve to become tasks.
//
// Two kinds of mail carry obligations for a student:
//   1. People writing to you directly.
//   2. Robot mail from school systems — Canvas/bCourses, Gradescope, Ed,
//      Piazza. This is automated, bulk-flagged, and lands in the Updates
//      tab, yet it's often the most task-shaped mail in the inbox. So the
//      allowlists run FIRST and outrank every noise signal below them.
// Everything else gets sieved: bulk-mail header, automated senders,
// transactional/marketing subjects.

// School and LMS senders always pass, unsubscribe headers and all.
const PRIORITY_SENDER =
  /instructure\.com|bcourses|canvas|gradescope|edstem|piazza|classroom\.google\.com|\.edu\b/i

// Deadline-shaped subjects pass regardless of sender.
const ACTION_SUBJECT =
  /\bdue\b|deadline|assignment|submit|homework|\bhw\s?\d|\bpset\b|problem set|\bquiz\b|\bexam\b|midterm|\bfinal\b|office hours|\brsvp\b|action required|past due|regrade|graded/i

const NOISE_SENDER =
  /no-?reply|do-?not-?reply|notifications?@|newsletter|mailer|mailchimp|updates@|digest|automated|alerts?@|billing@|receipts?@|marketing@|news@|promo|surveys?@|feedback@|hello@|support@|team@|info@/i

const NOISE_SUBJECT =
  /\bunsubscribe\b|newsletter|digest|receipt|your order|order (confirmed?|update)|has shipped|out for delivery|was delivered|verification code|verify your|confirm your (email|account)|password reset|security alert|new sign-?in|sign-?in attempt|welcome to|free trial|% off|\bsale\b|\bdiscount\b|deal of|webinar|take our .{0,24}survey|invoice|payment (received|confirmation)|statement is (ready|available)|renews|auto-?pay|terms of service|privacy policy|new login|weekly summary|monthly summary/i

export function looksLikeTask({ subject = '', from = '', hasUnsubscribe = false }) {
  if (PRIORITY_SENDER.test(from)) return true
  if (ACTION_SUBJECT.test(subject)) return true
  if (hasUnsubscribe) return false
  if (NOISE_SENDER.test(from)) return false
  if (NOISE_SUBJECT.test(subject)) return false
  return true
}
