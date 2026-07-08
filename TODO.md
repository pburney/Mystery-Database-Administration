# TODO

- [ ] Get `examples/Chinook_Sqlite.sqlite` working as a demonstration of the system
- [ ] Self-service password change for logged-in users — currently password changes only happen via Admin > Users (`requireAdmin`-gated), so non-admin users have no way to change their own password. The `password_is_default` flag is already tracked in the schema and returned from `/auth/me` but nothing in the frontend uses it (looks like a half-finished "please change your default password" nudge).
