require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./server');

let server;
const PORT = 5056;
const BASE_URL = `http://localhost:${PORT}`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = await response.text();
  }
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data
  };
}

async function runTests() {
  console.log('===============================================================');
  console.log('  Practical 5: MongoDB & Mongoose REST API Verification Tests ');
  console.log('  Student: Jay Ladva (24CS045) | ITUE301                        ');
  console.log('===============================================================\n');

  // Wait for MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('open', resolve));
  }

  let passed = 0;
  let total = 0;

  async function testCase(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${total}: ${name}`);
      console.error(`       Error: ${err.message}`);
    }
  }

  // 1. Health check
  await testCase('GET / - API root returns 200 OK and MongoDB status', async () => {
    const res = await request('/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.endpoints) throw new Error('Endpoints object missing');
  });

  // 2. POST /tasks without Content-Type header (Content-Type middleware)
  await testCase('POST /tasks without Content-Type header rejected with 400 Bad Request', async () => {
    const res = await request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'No Header Task' })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (res.data.error !== 'Bad Request') throw new Error(`Expected Bad Request error`);
  });

  // 3. POST /tasks with valid payload (MongoDB persistence)
  let createdTaskId;
  await testCase('POST /tasks creates task in MongoDB and returns 201 Created', async () => {
    const payload = {
      title: 'Practical 5 MongoDB Task',
      description: 'Verifying Mongoose schema and database insertion',
      completed: false,
      priority: 'high'
    };
    const res = await request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (!res.data.data._id) throw new Error('MongoDB _id is missing');
    if (res.data.data.title !== payload.title) throw new Error('Title mismatch');
    if (res.data.data.priority !== 'high') throw new Error('Priority mismatch');
    createdTaskId = res.data.data._id;
  });

  // 4. Schema Validation: Missing required title field
  await testCase('POST /tasks without required title returns 400 structured Validation Error', async () => {
    const res = await request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Missing title task' })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (res.data.error !== 'Validation Error') throw new Error(`Expected Validation Error, got ${res.data.error}`);
    if (!res.data.message.includes('Task title is required')) throw new Error('Expected required message');
  });

  // 5. Schema Validation: Invalid priority enum (Supplementary Problem 1)
  await testCase('POST /tasks with invalid priority enum returns 400 Validation Error', async () => {
    const res = await request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Enum Test Task',
        priority: 'urgent' // Not in ['low', 'medium', 'high']
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (res.data.error !== 'Validation Error') throw new Error(`Expected Validation Error`);
    if (!res.data.message.includes('Priority must be one of')) throw new Error('Expected enum error message');
  });

  // 6. Pre-save hook: Automatic title whitespace trimming (Supplementary Problem 2)
  let trimmedTaskId;
  await testCase('POST /tasks automatically trims title whitespace via pre-save hook', async () => {
    const untrimmedTitle = '    Whitespace Trimmed Task Title    ';
    const res = await request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: untrimmedTitle })
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (res.data.data.title !== 'Whitespace Trimmed Task Title') {
      throw new Error(`Expected trimmed title, got '${res.data.data.title}'`);
    }
    trimmedTaskId = res.data.data._id;
  });

  // 7. GET /tasks - Read all tasks
  await testCase('GET /tasks retrieves tasks from MongoDB and returns 200 OK', async () => {
    const res = await request('/tasks');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Expected array of tasks');
    if (res.data.count < 1) throw new Error('Expected at least 1 task in database');
  });

  // 8. GET /tasks/:id - Read single task by ID
  await testCase('GET /tasks/:id with valid existing ID returns 200 OK', async () => {
    const res = await request(`/tasks/${createdTaskId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data._id !== createdTaskId) throw new Error('ID mismatch');
  });

  // 9. GET /tasks/:id - Non-existent ID returns 404 (Supplementary Problem 3)
  await testCase('GET /tasks/:id with non-existent ObjectId returns 404 Not Found', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(`/tasks/${fakeId}`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    if (res.data.error !== 'Not Found') throw new Error('Expected Not Found error');
  });

  // 10. GET /tasks/:id with malformed ObjectId
  await testCase('GET /tasks/:id with malformed ObjectId rejected with 400 Bad Request', async () => {
    const res = await request('/tasks/invalid-id-123');
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (res.data.error !== 'Invalid Task ID') throw new Error('Expected Invalid Task ID');
  });

  // 11. PUT /tasks/:id - Update task in MongoDB
  await testCase('PUT /tasks/:id updates task in MongoDB and returns 200 OK', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true, priority: 'low' })
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.data.completed !== true) throw new Error('Completed not updated');
    if (res.data.data.priority !== 'low') throw new Error('Priority not updated');
  });

  // 12. DELETE /tasks/:id - Remove task from MongoDB
  await testCase('DELETE /tasks/:id removes task from MongoDB and returns 200 OK', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'DELETE'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

    // Verify task is deleted from database
    const verifyRes = await request(`/tasks/${createdTaskId}`);
    if (verifyRes.status !== 404) throw new Error('Deleted task still found in database');
  });

  // Clean up the trimmed test task
  if (trimmedTaskId) {
    await request(`/tasks/${trimmedTaskId}`, { method: 'DELETE' });
  }

  // 13. Undefined route custom 404 handler
  await testCase('GET /undefined-route returns structured 404 JSON response', async () => {
    const res = await request('/api/undefined-route');
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    if (res.data.error !== 'Route Not Found') throw new Error('Expected Route Not Found');
  });

  // 14. Centralized global error handler
  await testCase('GET /trigger-error triggers centralized 500 error handler', async () => {
    const res = await request('/trigger-error');
    if (res.status !== 500) throw new Error(`Expected 500, got ${res.status}`);
  });

  console.log('\n===============================================================');
  console.log(`  Test Results Summary: ${passed} / ${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================\n');

  server.close();
  await mongoose.disconnect();
}

server = app.listen(PORT, () => {
  runTests();
});
