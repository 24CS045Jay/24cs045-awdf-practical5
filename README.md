# Practical 5: MongoDB Integration and Schema Design with Mongoose

**Student Details:**
- **Name:** Jay Ladva
- **Student ID:** 24CS045
- **Email:** 24cs045@charusat.edu.in
- **Course:** ITUE301: Advance Web Development Framework
- **Institute:** CSPIT, Charotar University of Science and Technology (CHARUSAT)

---

## 📌 Objective
To connect a MongoDB database to an Express server and enforce strict data validation through Mongoose schema, replacing the in-memory array storage from Practical 4 with real database persistence.

---

## 🏗️ Architecture & Database Flow
```
Client (Postman / Browser / Test Suite)
   │
   ▼
[1. Request Logging Middleware] (Method, URL, ISO Timestamp)
   │
   ▼
[2. Content-Type Validator Middleware] (Enforces application/json on POST/PUT)
   │
   ▼
[3. Express Router & Controllers (Mongoose ODM)]
   ├── GET    /tasks              ──> Task.find() (200 OK)
   ├── GET    /tasks/:id          ──> validateTaskId ──> Task.findById() (200 OK / 404)
   ├── POST   /tasks              ──> Task.save() (201 Created / 400 Validation Error)
   ├── PUT    /tasks/:id          ──> validateTaskId ──> Task.findByIdAndUpdate() (200 OK / 404)
   └── DELETE /tasks/:id          ──> validateTaskId ──> Task.findByIdAndDelete() (200 OK / 404)
   │
   ▼
[4. Mongoose Schema Validation & Pre-Save Hooks]
   ├── Required fields validation: title
   ├── Priority enum validation: ['low', 'medium', 'high']
   └── Pre-save hook: Automatic whitespace trimming on title
   │
   ▼
[5. MongoDB Database Engine (localhost:27017)]
   └── tasks collection { _id, title, description, completed, priority, createdAt }
   │
   ▼
[6. Centralized Error Handler] (Formats Mongoose ValidationErrors to clean JSON)
```

---

## 📋 Task Mongoose Schema (`models/Task.js`)

| Field | Type | Constraints / Defaults | Description |
|-------|------|------------------------|-------------|
| `title` | `String` | `required: true`, trimmed | Title of the task |
| `description` | `String` | `default: ''` | Detailed task description |
| `completed` | `Boolean` | `default: false` | Task completion status flag |
| `priority` | `String` | `enum: ['low', 'medium', 'high']`, `default: 'medium'` | Task urgency level (Supplementary 1) |
| `createdAt` | `Date` | `default: Date.now` | Creation timestamp |

### Pre-Save Hook (Supplementary Problem 2)
```javascript
taskSchema.pre('save', function () {
  if (this.title && typeof this.title === 'string') {
    this.title = this.title.trim();
  }
});
```

---

## 🚀 REST API Endpoints

| HTTP Method | Route | Description | Status Codes |
|-------------|-------|-------------|--------------|
| `GET` | `/` | Root endpoint showing API and MongoDB status | `200 OK` |
| `GET` | `/tasks` | Retrieve all tasks from MongoDB (supports query filters) | `200 OK` |
| `GET` | `/tasks/:id` | Retrieve single task by 24-char ObjectId | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `POST` | `/tasks` | Create and persist task in MongoDB | `201 Created`, `400 Validation Error` |
| `PUT` | `/tasks/:id` | Update task document in MongoDB | `200 OK`, `400 Validation Error`, `404 Not Found` |
| `DELETE` | `/tasks/:id` | Remove task document from MongoDB | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `GET` | `/trigger-error` | Deliberately triggers centralized error handler | `500 Internal Server Error` |

---

## 🛠️ Setup & Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env` using `.env.example`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/task_manager_db
   ```

3. **Start the API server:**
   ```bash
   npm start
   ```

4. **Run automated verification test suite:**
   ```bash
   npm test
   ```
