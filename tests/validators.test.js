const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('validateCreateTask', () => {
  it('accepts a valid payload', () => {
    expect(validateCreateTask({ title: 'Valid' })).toBeNull();
  });

  it('requires a non-empty title', () => {
    expect(validateCreateTask({})).toMatch(/title is required/i);
    expect(validateCreateTask({ title: '   ' })).toMatch(/title is required/i);
    expect(validateCreateTask({ title: 1 })).toMatch(/title is required/i);
  });

  it('rejects invalid status, priority, and dueDate', () => {
    expect(validateCreateTask({ title: 'A', status: 'blocked' })).toMatch(/status must be one of/i);
    expect(validateCreateTask({ title: 'A', priority: 'urgent' })).toMatch(/priority must be one of/i);
    expect(validateCreateTask({ title: 'A', dueDate: 'not-a-date' })).toMatch(/dueDate must be a valid ISO/i);
  });
});

describe('validateUpdateTask', () => {
  it('accepts an empty update and a valid partial update', () => {
    expect(validateUpdateTask({})).toBeNull();
    expect(validateUpdateTask({ title: 'Renamed', status: 'done', priority: 'low' })).toBeNull();
  });

  it('rejects empty title and invalid enums/dates', () => {
    expect(validateUpdateTask({ title: '  ' })).toMatch(/title must be a non-empty string/i);
    expect(validateUpdateTask({ status: 'nope' })).toMatch(/status must be one of/i);
    expect(validateUpdateTask({ priority: 'nope' })).toMatch(/priority must be one of/i);
    expect(validateUpdateTask({ dueDate: 'nope' })).toMatch(/dueDate must be a valid ISO/i);
  });
});

describe('validateAssignTask', () => {
  it('accepts a non-empty assignee string', () => {
    expect(validateAssignTask({ assignee: 'Ada' })).toBeNull();
  });

  it('rejects missing, non-string, empty, and blank assignees', () => {
    expect(validateAssignTask({})).toMatch(/assignee is required/i);
    expect(validateAssignTask({ assignee: '' })).toMatch(/assignee is required/i);
    expect(validateAssignTask({ assignee: 12 })).toMatch(/assignee is required/i);
    expect(validateAssignTask({ assignee: null })).toMatch(/assignee is required/i);
    expect(validateAssignTask({ assignee: '   ' })).toMatch(/assignee is required/i);
  });
});
