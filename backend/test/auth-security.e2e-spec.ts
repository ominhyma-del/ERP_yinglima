import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Enterprise Authentication & Security Test Suite (Prompts 4-13)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. GET /health - System Health check is publicly accessible', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('Healthy');
  });

  it('2. POST /auth/login - Invalid Password triggers standardized SecurityException', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@yinglima.com',
      password: 'WrongPassword999!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  it('3. POST /auth/login - Successful Login returns JWT Access/Refresh tokens & Session ID', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@yinglima.com',
      password: 'admin123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@yinglima.com');
  });

  it('4. POST /auth/refresh - Token Rotation & Sliding Session extension succeeds', async () => {
    // 1. Initial Login
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@yinglima.com',
      password: 'admin123',
    });

    const refreshToken = loginRes.body.data.refreshToken;

    // 2. Token Refresh
    const refreshRes = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken,
    });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken); // Token rotated!
  });

  it('5. POST /auth/refresh - Replay Attack on old rotated token triggers SECURITY LOCKOUT', async () => {
    // 1. Initial Login
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@yinglima.com',
      password: 'admin123',
    });

    const oldRefreshToken = loginRes.body.data.refreshToken;

    // 2. Rotate token once
    await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: oldRefreshToken,
    });

    // 3. Attempt to REPLAY the old rotated token -> Must fail & revoke all sessions!
    const replayRes = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: oldRefreshToken,
    });

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.success).toBe(false);
  });
});
