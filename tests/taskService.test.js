const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  it('creates a task with defaults', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task.id).toEqual(expect.any(String));
    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.assignee).toBeNull();
    expect(task.createdAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
  });

  it('creates a task with provided fields', () => {
    const task = taskService.create({
      title: 'Ship feature',
      description: 'Add assign endpoint',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-01-01T00:00:00.000Z',
    });

    expect(task).toMatchObject({
      title: 'Ship feature',
      description: 'Add assign endpoint',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-01-01T00:00:00.000Z',
    });
  });
});

describe('getAll / findById / remove', () => {
  it('returns a copy of all tasks', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.pop();
    expect(taskService.getAll()).toHaveLength(1);
  });

  it('finds a task by id and returns undefined when missing', () => {
    const created = taskService.create({ title: 'Find me' });
    expect(taskService.findById(created.id).title).toBe('Find me');
    expect(taskService.findById('missing')).toBeUndefined();
  });

  it('removes a task and returns false when missing', () => {
    const created = taskService.create({ title: 'Delete me' });
    expect(taskService.remove(created.id)).toBe(true);
    expect(taskService.findById(created.id)).toBeUndefined();
    expect(taskService.remove(created.id)).toBe(false);
  });
});

describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Doing', status: 'in_progress' });
    taskService.create({ title: 'Done', status: 'done' });
  });

  it('returns tasks with the given status', () => {
    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Todo');
  });

  it('returns an empty list when nothing matches', () => {
    taskService._reset();
    expect(taskService.getByStatus('todo')).toEqual([]);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i += 1) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  it('returns the first page using 1-based page numbers', () => {
    const page = taskService.getPaginated(1, 2);
    expect(page.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
  });

  it('returns a later page', () => {
    const page = taskService.getPaginated(3, 2);
    expect(page.map((t) => t.title)).toEqual(['Task 5']);
  });

  it('returns an empty list past the last page', () => {
    expect(taskService.getPaginated(10, 2)).toEqual([]);
  });
});

describe('getStats', () => {
  it('counts statuses and overdue incomplete tasks', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();

    taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: past });
    taskService.create({ title: 'Doing future', status: 'in_progress', dueDate: future });
    taskService.create({ title: 'Done overdue', status: 'done', dueDate: past });
    taskService.create({ title: 'No due date', status: 'todo' });

    expect(taskService.getStats()).toEqual({
      todo: 2,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });
});

describe('update', () => {
  it('updates provided fields and returns null when missing', () => {
    const created = taskService.create({ title: 'Old' });
    const updated = taskService.update(created.id, { title: 'New', status: 'in_progress' });

    expect(updated.title).toBe('New');
    expect(updated.status).toBe('in_progress');
    expect(updated.id).toBe(created.id);
    expect(taskService.update('missing', { title: 'Nope' })).toBeNull();
  });
});

describe('completeTask', () => {
  it('marks a task done and sets completedAt', () => {
    const created = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(created.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(completed.completedAt))).toBe(false);
  });

  it('returns null when the task does not exist', () => {
    expect(taskService.completeTask('missing')).toBeNull();
  });
});

describe('assignTask', () => {
  it('sets assignee on the task', () => {
    const created = taskService.create({ title: 'Owned' });
    const assigned = taskService.assignTask(created.id, 'Ada');

    expect(assigned.assignee).toBe('Ada');
    expect(taskService.findById(created.id).assignee).toBe('Ada');
  });

  it('allows reassignment', () => {
    const created = taskService.create({ title: 'Owned' });
    taskService.assignTask(created.id, 'Ada');
    const reassigned = taskService.assignTask(created.id, 'Grace');

    expect(reassigned.assignee).toBe('Grace');
  });

  it('returns null when the task does not exist', () => {
    expect(taskService.assignTask('missing', 'Ada')).toBeNull();
  });
});
