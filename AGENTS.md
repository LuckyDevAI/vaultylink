# Architecture rules
- Authentication email handling stays scaffold-owned; customize only its React Email templates to retain verified dispatch behavior.
- App emails use the managed template helper in each existing feature function; only the existing administrator-composed HTML sender uses a direct managed API call because its free-form composition cannot fit fixed template props.
- Retain legacy email tables as audit-only records; never consult them to gate suppression or recreate email queues.
- Email event reactions stay in the scaffolded handle-email-events receiver and deduplicate audit writes using the event ID.
- Billing rules live in the shared billing policy; Checkout enforces trusted prices and Stripe trialing status grants annual access, so client input cannot override billing terms.
- Stripe subscription state is reconciled on account/vault refresh and before expiry actions without webhooks; trials must not produce paid receipts or annual-expiry reminders.