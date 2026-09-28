const taskService = require('../src/services/taskService');
const { validateUpdateTask } = require('../src/utils/validators');

beforeEach(() => {
  taskService._reset();
});

describe('known bugs (still present)', () => {
  test.failing('getByStatus should match status exactly, not as a substring', () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    const matches = taskService.getByStatus('do');
    expect(matches).toEqual([]);
  });

  test.failing('completeTask should not reset priority to medium', () => {
    const created = taskService.create({ title: 'Urgent', priority: 'high' });
    const completed = taskService.completeTask(created.id);
    expect(completed.priority).toBe('high');
  });

  test.failing('update should not allow overwriting the task id', () => {
    const created = taskService.create({ title: 'Stable id' });
    const updated = taskService.update(created.id, { id: 'hijacked' });
    expect(updated.id).toBe(created.id);
    expect(taskService.findById(created.id)).not.toBeUndefined();
  });

  test.failing('validateUpdateTask should reject an empty status string', () => {
    expect(validateUpdateTask({ status: '' })).toMatch(/status must be one of/i);
  });
});
