import { buildApp } from '../src/app';

async function runTests() {
  console.log('--- Running API Smoke Tests ---');
  const app = buildApp();

  try {
    // Test Health Route
    const healthRes = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    console.log(`GET /api/v1/health status: ${healthRes.statusCode}`);
    const healthBody = JSON.parse(healthRes.body);
    if (healthRes.statusCode !== 200 || healthBody.status !== 'ok') {
      throw new Error('Health check failed');
    }
    console.log('Health check passed!');

    // Test Unauthorized BESS list (Should return 401)
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bess',
    });

    console.log(`GET /api/v1/bess (unauthorized) status: ${listRes.statusCode}`);
    if (listRes.statusCode !== 401) {
      throw new Error('Access control check failed: allowed unauthorized request');
    }
    console.log('Auth protection verified successfully!');

    console.log('All API smoke tests passed successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('Smoke tests failed:', err.message);
    process.exit(1);
  }
}

runTests();
