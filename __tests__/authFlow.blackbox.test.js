// Black-box tests for portal auth endpoints.
// We intentionally point BACKEND_URL to a closed local port so that login fails fast
// without needing the real backend to be running.
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:1';

const request = require('supertest');
const app = require('../server');

describe('Auth flow - black box', () => {
  test('GET /auth/login returns 200 and includes login form', async () => {
    const res = await request(app).get('/auth/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('form');
    expect(res.text).toContain('name="email"');
    expect(res.text).toContain('name="password"');
  });

  test('POST /auth/login (invalid creds/offline backend) redirects back to /auth/login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ email: 'bad@example.com', password: 'wrong' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  test('POST /auth/login (empty fields) redirects back to /auth/login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ email: '', password: '' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  test('GET /auth/logout redirects to /auth/login', async () => {
    const res = await request(app).get('/auth/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });

  test('GET /chat/conversations redirects to /auth/login when not authenticated', async () => {
    const res = await request(app).get('/chat/conversations');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/auth/login');
  });
});
