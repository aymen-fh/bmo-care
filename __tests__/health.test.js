const request = require('supertest');

// server.js now exports the Express app in test env
const app = require('../server');

describe('Specialist Portal - black box', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(String(res.text)).toContain('Web Portal');
  });

  test('Unknown route returns 404', async () => {
    const res = await request(app).get('/__does_not_exist__');
    expect(res.status).toBe(404);
  });
});
