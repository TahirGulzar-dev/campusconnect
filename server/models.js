const mongoose = require('mongoose');
const { Schema } = mongoose;

const department = new Schema({
  _id: String,
  name: String,
  key: { type: String, unique: true },
  description: String,
  active: { type: Boolean, default: true },
});

const category = new Schema({
  _id: String,
  name: String,
  key: String,
  departmentId: String,
  description: String,
  active: { type: Boolean, default: true },
});
category.index({ departmentId: 1, key: 1 }, { unique: true });

const user = new Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ['student', 'department', 'super'] },
  departmentId: String,
  firstLogin: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
});

const complaint = new Schema({
  studentId: { type: Schema.Types.ObjectId, index: true },
  departmentId: { type: String, index: true },
  code: { type: String, unique: true },
  title: String,
  description: String,
  category: String,
  department: String,
  student: String,
  studentEmail: String,
  image: String,
  status: { type: String, default: 'Pending' },
  resolutionNote: String,
  rejectionReason: String,
  replies: [{ _id: false, author: String, text: String, at: Date }],
  events: [{ _id: false, title: String, detail: String, at: Date }],
}, { timestamps: true });

module.exports = {
  Department: mongoose.model('Department', department),
  Category: mongoose.model('Category', category),
  User: mongoose.model('User', user),
  Complaint: mongoose.model('Complaint', complaint),
};
