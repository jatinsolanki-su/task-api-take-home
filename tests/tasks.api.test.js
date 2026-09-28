const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

const createTask = (overrides = {}) =>
  request(app).post('/tasks').send({ title: 'Default', ...overrides });

describe('POST /tasks', () => {
  it('creates a task (happy path)', async () => {
    const res = await createTask({ title: 'New task', description: 'Details' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New task',
      description: 'Details',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
      assignee: null,
    });
    expect(res.body.id).toEqual(expect.any(String));
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ description: 'No title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/i);
  });

  it('returns 400 for an invalid status', async () => {
    const res = await createTask({ status: 'blocked' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status must be one of/i);
  });
});

describe('GET /tasks', () => {
  it('lists all tasks (happy path)', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((t) => t.title)).toEqual(['A', 'B']);
  });

  it('filters by status=todo', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Doing', status: 'in_progress' });
    await createTask({ title: 'Done', status: 'done' });

    const res = await request(app).get('/tasks').query({ status: 'todo' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo');
  });

  it('filters by status=in_progress', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Doing', status: 'in_progress' });

    const res = await request(app).get('/tasks').query({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Doing');
  });

  it('paginates with page=1 and limit=10', async () => {
    for (let i = 1; i <= 12; i += 1) {
      await createTask({ title: `Task ${i}` });
    }

    const res = await request(app).get('/tasks').query({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[9].title).toBe('Task 10');
  });

  it('paginates with 1-based page numbers', async () => {
    await createTask({ title: '1' });
    await createTask({ title: '2' });
    await createTask({ title: '3' });

    const res = await request(app).get('/tasks').query({ page: 1, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['1', '2']);
  });

  it('returns an empty list when there are no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /tasks/stats', () => {
  it('returns counts by status and overdue (happy path)', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    await createTask({ title: 'Overdue', dueDate: past });
    await createTask({ title: 'Done', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todo: 1,
      in_progress: 0,
      done: 1,
      overdue: 1,
    });
  });

  it('returns zeros when the store is empty', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
});

describe('PUT /tasks/:id', () => {
  it('updates a task (happy path)', async () => {
    const created = await createTask({ title: 'Old' });
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'Updated', status: 'in_progress', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      title: 'Updated',
      status: 'in_progress',
      priority: 'high',
    });
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app).put('/tasks/missing-id').send({ title: 'Nope' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  it('returns 400 for invalid priority', async () => {
    const created = await createTask();
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ priority: 'critical' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority must be one of/i);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task (happy path)', async () => {
    const created = await createTask();
    const res = await request(app).delete(`/tasks/${created.body.id}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    const list = await request(app).get('/tasks');
    expect(list.body).toHaveLength(0);
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app).delete('/tasks/missing-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task complete (happy path)', async () => {
    const created = await createTask({ title: 'Wrap up' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toEqual(expect.any(String));
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app).patch('/tasks/missing-id/complete');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task (happy path)', async () => {
    const created = await createTask({ title: 'Owned' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Ada Lovelace' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Ada Lovelace');
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/missing-id/assign')
      .send({ assignee: 'Ada' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  it('returns 400 when assignee is an empty string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee is required/i);
  });

  it('returns 400 when assignee is whitespace-only', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee is required/i);
  });

  it('returns 400 when assignee is not a string', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 42 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee is required/i);
  });

  it('returns 400 when assignee is missing', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee is required/i);
  });

  it('trims surrounding whitespace on a valid assignee', async () => {
    const created = await createTask();
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '  Ada  ' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Ada');
  });

  it('allows reassignment when the task is already assigned', async () => {
    const created = await createTask();
    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Ada' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Grace Hopper' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Grace Hopper');
  });
});
