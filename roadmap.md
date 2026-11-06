# Task roadmap

## Open
1. **Order emails for MobileConnect** — user request 2026-11-03: email the owner every new order placed in MobileConnect with its items and total. Blocked: no sender email domain configured (setup dialog shown). Once the domain is active: setup_email_infra → scaffold_transactional_email → order-confirmation template (items + total) → trigger in saveAppRecord for kind "orders"/"sales" (new records only, skipped when cancelled/refunded), idempotency key from record id.
2. **~~Second-account isolation test~~ DONE 2026-11-04** — second account buildflow.test2@buildflowqa-check.com (id 685fbb1e-1f51-480e-bdc0-4ca8fa2dc9a5, unconfirmed, minted session): raw Data API as its token returns zero projects and zero module_records; in the preview, /dashboard and every direct /run/:id link redirect to onboarding. PASS. Note: signup flow fixed (email-confirmation screen instead of silent bounce; labels linked, autocomplete added). Extra unconfirmed test user buildflow.test3@… created while verifying — harmless, could not be deleted (no supported auth-user deletion path).
3. **20k-customer readiness** — no load testing done; cannot claim ready. Report honestly until tested or scoped.
4. **User decision: contact cascade** — deleting a deal/booking currently keeps its auto-created contact. Awaiting user decision (keep as-is unless told otherwise).

## Done (recent)
- Multi-item order stock support (orders listing several items reduce stock per item), tested live in MobileConnect; 13 stock tests pass.
- Form labels linked to inputs; validation alerts announced; save/refresh/delete re-verified.
- Release-hardening fixes: error retry, records error states, stock edge cases (cancellation restores stock, self-reference fix).
