# Submission note

## What would I test next if I had more time?

Concurrent creates/updates against the in-memory array, combining `status` with `page`/`limit` (today a status query skips pagination), clearing `dueDate` with `null`, invalid `page`/`limit` values, and auth or ownership rules if this API were exposed beyond a single process.

## What surprised me in the codebase?

`_reset` was already available for tests, which made isolation straightforward. Two bugs were easy to miss without tests: pagination using a 0-based offset against a 1-based query API, and `completeTask` silently rewriting `priority` to `medium`.

## Questions before shipping this to production?

Is this API single-process only, or do we need a real store and multiple instances? Should list, filter, and pagination be one contract? Do we need auth, rate limits, and a versioned task shape (including `assignee`)? What should happen if `GET /tasks?status=` is an unknown value?

## Assign endpoint design

`PATCH /tasks/:id/assign` stores a trimmed assignee string on the task and returns the updated task.

- **404** if the task does not exist
- **400** if `assignee` is missing, not a string, empty, or whitespace-only
- **Reassignment is allowed.** Nothing in the existing architecture treats assignee as a lock or unique owner. Overwriting is the smallest change that matches “assign this task to this person,” including when the person changes.
