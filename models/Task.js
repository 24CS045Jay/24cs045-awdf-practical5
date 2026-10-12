const mongoose = require('mongoose');

/**
 * Task Schema Definition (Practical 5)
 * Fields:
 * - title: String, required
 * - description: String
 * - completed: Boolean, default false
 * - priority: String, enum ['low', 'medium', 'high'], default 'medium' (Supplementary Problem 1)
 * - createdAt: Date, default Date.now
 */
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required']
  },
  description: {
    type: String,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be one of: low, medium, high'
    },
    default: 'medium',
    lowercase: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Supplementary Problem 2: Pre-save hook that automatically trims whitespace from the title field
taskSchema.pre('save', function () {
  if (this.title && typeof this.title === 'string') {
    this.title = this.title.trim();
  }
});

module.exports = mongoose.model('Task', taskSchema);
