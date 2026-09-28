# Bug report

These bugs were found by writing unit and API tests against the documented behavior of the existing Task Manager API. Remaining issues are also encoded as `test.failing` cases in `tests/knownBugs.test.js` so the assertions stay strict without making `npm test` fail.

Only one bug was fixed, as required.

---

## 1. Pagination is off-by-one (fixed)

**Expected behavior:** `GET /tasks?page=1&limit=10` uses 1-based pages, so page 1 is the first `limit` tasks.

**Actual behavior:** `getPaginated` used `offset = page * limit`. Page 1 started at index `limit` and skipped the first page of results.

**How the bug was discovered:** Unit tests for `getPaginated(1, 2)` and integration tests for `GET /tasks?page=1&limit=2` returned the third and fourth tasks instead of the first two. The code lives in `src/services/taskService.js` (`getPaginated`).

**What a fix would look like:** Use `(page - 1) * limit` as the slice offset.

**Fix applied:** `offset = (page - 1) * limit`. The tests that exposed this now pass.

---

## 2. Status filter matches substrings (not fixed)

**Expected behavior:** `GET /tasks?status=todo` (and `getByStatus`) should return only tasks whose status equals that value.

**Actual behavior:** `getByStatus` uses `t.status.includes(status)`. A query like `status=do` returns both `todo` and `done`. Full values such as `todo` still work by coincidence.

**How the bug was discovered:** A unit test asserting that `getByStatus('do')` returns no tasks failed; the store returned both `todo` and `done`. The code lives in `src/services/taskService.js` (`getByStatus`).

**What a fix would look like:** Compare with `t.status === status`. Optionally reject unknown status values with 400.

---

## 3. Completing a task resets priority (not fixed)

**Expected behavior:** `PATCH /tasks/:id/complete` should set `status` to `done` and `completedAt` to now. Priority should stay as the caller set it.

**Actual behavior:** `completeTask` hard-codes `priority: 'medium'`.

**How the bug was discovered:** Completing a `high` priority task in a unit test produced `priority: 'medium'`. The code lives in `src/services/taskService.js` (`completeTask`).

**What a fix would look like:** Spread the existing task and only update `status` and `completedAt`.

---

## 4. PUT can overwrite identity fields (not fixed)

**Expected behavior:** Clients should not be able to change `id` (or `createdAt`) via `PUT /tasks/:id`.

**Actual behavior:** `update` does `{ ...task, ...fields }` with no field allowlist, so a body like `{ "id": "hijacked" }` replaces the id.

**How the bug was discovered:** A unit test that updated with a different `id` and then looked up the original id. The code lives in `src/services/taskService.js` (`update`).

**What a fix would look like:** Copy only allowed fields (`title`, `description`, `status`, `priority`, `dueDate`, maybe `assignee`) instead of spreading the whole body.

---

## 5. Empty status on update is accepted (not fixed)

**Expected behavior:** `status` must be one of `todo`, `in_progress`, `done`. An empty string should be rejected with 400.

**Actual behavior:** `validateUpdateTask` uses `if (body.status && ...)`, so `""` is treated as absent and stored on the task.

**How the bug was discovered:** A unit test expecting `validateUpdateTask({ status: '' })` to return a validation error currently fails. The code lives in `src/utils/validators.js` (`validateUpdateTask`).

**What a fix would look like:** Treat `status` as present when the key is defined (`body.status !== undefined`) and then check membership in `VALID_STATUSES`.
