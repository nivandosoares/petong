# Password Reset Flow

The platform now supports a minimal password reset flow for local and browser-tested auth recovery.

## API endpoints

- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

## Behavior

`/api/auth/password-reset/request` accepts:

- `email`

It returns:

- `ok`
- `resetToken`

The reset token is returned directly because the current stack does not include an email delivery system yet. This keeps the flow testable in local development and Selenium runs.

`/api/auth/password-reset/confirm` accepts:

- `resetToken`
- `newPassword`

It updates the stored password hash, invalidates the reset token, and returns a fresh auth token.

## Frontend

The access route now includes:

- register form
- login form
- password reset request form
- password reset confirm form

On request success, the reset token is copied into the confirm form automatically to streamline local testing.

## Selenium coverage

The Selenium runner now supports an `auth-flow` scenario that exercises:

- signup
- password reset
- NGO creation
- pet registration
- adoption application submission
- public landing page view
