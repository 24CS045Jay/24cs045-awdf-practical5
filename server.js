/**
 * Charotar University of Science and Technology (CHARUSAT)
 * CSPIT - Computer Science & Engineering
 * Course: Advanced Web Development Frameworks (ITUE301)
 * Practical 5: MongoDB Integration and Schema Design with Mongoose
 * Student: Jay Ladva (24CS045)
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_manager_db';

// ==========================================
// 1. Built-in JSON Body Parsing Middleware
// ==========================================
app.use(express.json());

// ==========================================
// 2. Global Request Logging Middleware
// Logs HTTP Method, Request URL, and Timestamp
// ==========================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// 3. Content-Type Validation Middleware
// Rejects POST / PUT requests missing 'application/json' Content-Type
// ==========================================
const requireJsonContent = (req, res, next) => {
  if (['POST', 'PUT'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Requests with payload (POST/PUT) must include "Content-Type: application/json" header.'
      });
    }
  }
  next();
};

app.use(requireJsonContent);

// ==========================================
// 4. Route-Specific ID Validation Middleware
// Validates 24-character hexadecimal MongoDB ObjectId format
// ==========================================
const validateTaskId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Invalid Task ID',
      message: `The provided ID '${id}' is not a valid 24-character MongoDB ObjectId.`
    });
  }
  next();
};

// ==========================================
// 5. RESTful CRUD Routes for Tasks (Mongoose Model Operations)
// ==========================================

// GET / - Root Health / Welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Task Manager RESTful API with MongoDB & Mongoose (Practical 5)',
    author: 'Jay Ladva (24CS045)',
    course: 'ITUE301: Advanced Web Development Frameworks',
    database: mongoose.connection.readyState === 1 ? 'Connected (MongoDB)' : 'Connecting...',
    endpoints: {
      getAllTasks: 'GET /tasks',
      getTaskById: 'GET /tasks/:id',
      createTask: 'POST /tasks',
      updateTask: 'PUT /tasks/:id',
      deleteTask: 'DELETE /tasks/:id'
    }
  });
});

// GET /tasks - Read all tasks (supports query filtering by ?completed=, ?priority=, ?search=)
app.get('/tasks', async (req, res, next) => {
  try {
    const { completed, priority, search } = req.query;
    const filter = {};

    if (completed !== undefined) {
      filter.completed = completed === 'true';
    }
    if (priority) {
      filter.priority = priority.toLowerCase();
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
});

// GET /tasks/:id - Read single task by ID (Supplementary Problem 3: returns 404 if not found)
app.get('/tasks/:id', validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with ID ${req.params.id} does not exist in the database.`
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
});

// POST /tasks - Create a new task in MongoDB using Task.create() / new Task().save()
app.post('/tasks', async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    // Notice: Mongoose pre-save hook handles whitespace trimming on title
    // Mongoose schema enforces required: true and priority enum
    const task = new Task({
      title,
      description,
      completed,
      priority
    });

    const savedTask = await task.save();

    res.status(201).json({
      success: true,
      message: 'Task created successfully in MongoDB database.',
      data: savedTask
    });
  } catch (err) {
    next(err);
  }
});

// PUT /tasks/:id - Update an existing task using Task.findByIdAndUpdate()
app.put('/tasks/:id', validateTaskId, async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (completed !== undefined) updates.completed = completed;
    if (priority !== undefined) updates.priority = priority;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with ID ${req.params.id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully in MongoDB.',
      data: updatedTask
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /tasks/:id - Delete a task using Task.findByIdAndDelete()
app.delete('/tasks/:id', validateTaskId, async (req, res, next) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Task with ID ${req.params.id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully from MongoDB.',
      data: deletedTask
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. Deliberate Error Trigger (Faculty Demonstration)
// ==========================================
app.get('/trigger-error', (req, res, next) => {
  const err = new Error('Demonstration: Deliberately triggered internal server error.');
  err.status = 500;
  next(err);
});

// ==========================================
// 7. Custom 404 Handler for Undefined Routes
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}. This endpoint does not exist.`,
    validRoutes: [
      'GET    /tasks',
      'GET    /tasks/:id',
      'POST   /tasks',
      'PUT    /tasks/:id',
      'DELETE /tasks/:id',
      'GET    /trigger-error'
    ]
  });
});

// ==========================================
// 8. Global Centralized Error Handling Middleware
// Formats Mongoose ValidationErrors and CastErrors cleanly
// ==========================================
app.use((err, req, res, next) => {
  console.error('[Global Error Handler] Caught Exception:\n', err.stack || err.message);

  // Mongoose Validation Error (e.g. required field missing, enum mismatch)
  if (err.name === 'ValidationError') {
    const errorDetails = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: errorDetails.join(', '),
      fields: Object.keys(err.errors)
    });
  }

  // Mongoose Cast Error (e.g. bad ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid Parameter',
      message: `Invalid format for field '${err.path}': ${err.value}`
    });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong on the server.'
  });
});

// ==========================================
// 9. Database Connection & Server Initialization
// ==========================================
let serverInstance = null;

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[MongoDB] Connected successfully to: ${MONGO_URI}`);

    if (require.main === module) {
      serverInstance = app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`Task Manager REST API (Practical 5) running on port ${PORT}`);
        console.log(`Base URL: http://localhost:${PORT}`);
        console.log(`MongoDB Database: Connected via Mongoose`);
        console.log(`====================================================`);
      });
    }
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
  }
};

startServer();

module.exports = app;
