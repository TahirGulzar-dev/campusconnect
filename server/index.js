const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const connectDb = require('./db');
const { Department, Category, User, Complaint } = require('./models');

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '3mb' }));

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function field(value, label, max, min = 1) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length < min || normalized.length > max) {
    fail(400, label + ' must contain ' + min + '–' + max + ' characters.');
  }
  return normalized;
}

function emailField(value) {
  const email = field(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
  return email;
}

function passwordField(password) {
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    fail(400, 'Use a password of at least 8 characters and at most 72 bytes.');
  }
  return password;
}

function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    fail(503, 'Server authentication is unavailable.');
  }
  return process.env.JWT_SECRET;
}

async function account(user) {
  const department = user.departmentId ? await Department.findById(user.departmentId) : null;
  return { label: user.name, email: user.email, role: user.role, department: department?.name, firstLogin: user.firstLogin };
}

async function session(user) {
  const token = jwt.sign({ version: user.tokenVersion }, secret(), {
    subject: String(user._id), expiresIn: user.firstLogin ? '15m' : '8h',
  });
  return { token, account: await account(user) };
}

async function authenticate(req, res, next) {
  const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) fail(401, 'Sign in to continue.');
  const key = secret();
  let claims;
  try {
    claims = jwt.verify(token, key, { algorithms: ['HS256'] });
  } catch {
    fail(401, 'Your session has expired. Sign in again.');
  }
  const user = await User.findById(claims.sub);
  if (!user || claims.version !== user.tokenVersion) fail(401, 'Sign in again.');
  req.user = user;
  next();
}

function ready(req, res, next) {
  if (req.user.firstLogin) fail(403, 'Set a new password to continue.');
  next();
}

function role(required) {
  return (req, res, next) => {
    if (req.user.role !== required) fail(403, 'This action is unavailable.');
    next();
  };
}

app.get('/api/health', async (req, res) => {
  await connectDb();
  await mongoose.connection.db.command({ ping: 1 });
  res.json({ ok: true, message: 'CampusConnect API is running', database: mongoose.connection.name });
});

app.use('/api', async (req, res, next) => {
  await connectDb();
  next();
});

app.post('/api/auth/register', async (req, res) => {
  secret();
  const { name, email, password } = req.body || {};
  const user = await User.create({
    name: field(name, 'Name', 100),
    email: emailField(email),
    passwordHash: await bcrypt.hash(passwordField(password), 12),
    role: 'student',
  });
  res.status(201).json(await session(user));
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: emailField(email) }).select('+passwordHash');
  if (!user || typeof password !== 'string' || Buffer.byteLength(password) > 72 ||
      !(await bcrypt.compare(password, user.passwordHash))) {
    fail(401, 'Incorrect email or password.');
  }
  res.json(await session(user));
});

app.use('/api', authenticate);
app.get('/api/auth/me', async (req, res) => res.json(await account(req.user)));
app.post('/api/auth/password', async (req, res) => {
  const { current, password } = req.body || {};
  const user = await User.findById(req.user.id).select('+passwordHash');
  const nextPassword = passwordField(password);
  if (!user.firstLogin && (typeof current !== 'string' || Buffer.byteLength(current) > 72 ||
      !(await bcrypt.compare(current, user.passwordHash)))) {
    fail(400, 'The current password is incorrect.');
  }
  if (await bcrypt.compare(nextPassword, user.passwordHash)) fail(400, 'Choose a different password.');
  const changed = await User.findOneAndUpdate(
    { _id: user.id, tokenVersion: user.tokenVersion },
    { $set: { passwordHash: await bcrypt.hash(nextPassword, 12), firstLogin: false }, $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' },
  );
  if (!changed) fail(409, 'Your password changed. Sign in again.');
  res.json(await session(changed));
});

app.use('/api', ready);

const when = (date, time = true) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Karachi', dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}),
}).format(date);

function complaintView(item) {
  return {
    id: item.code, departmentId: item.departmentId, title: item.title, category: item.category, department: item.department,
    student: item.student, studentEmail: item.studentEmail, date: when(item.createdAt, false), createdAt: item.createdAt,
    status: item.status, description: item.description, image: item.image,
    resolutionNote: item.resolutionNote, rejectionReason: item.rejectionReason,
    replies: item.replies.map(({ author, text, at }) => ({ author, text, at: when(at) })),
    events: item.events.map(({ title, detail, at }) => ({ title, detail, at: when(at) })),
  };
}

function scope(user) {
  if (user.role === 'super') return {};
  if (user.role === 'department') return { departmentId: user.departmentId || null };
  return { studentId: user._id };
}

app.get('/api/workspace', async (req, res) => {
  const { user } = req;
  const [departments, categories, complaints, admins] = await Promise.all([
    Department.find().sort({ name: 1 }).lean(),
    Category.find().sort({ name: 1 }).lean(),
    Complaint.find(scope(user)).select('-image').sort({ createdAt: -1 }).lean(),
    user.role === 'super' ? User.find({ role: 'department' }).lean() : [],
  ]);
  const byId = new Map(departments.map((department) => [department._id, department]));
  const visibleCategories = categories.filter((category) => {
    if (user.role === 'super') return true;
    if (user.role === 'department') return category.departmentId === user.departmentId;
    return category.active && byId.get(category.departmentId)?.active;
  });
  res.json({
    account: { label: user.name, email: user.email, role: user.role, department: byId.get(user.departmentId)?.name },
    departments: departments.filter((department) => user.role === 'super' || department.active)
      .map(({ _id, name, description, active }) => ({ id: _id, name, description, active })),
    categories: visibleCategories.map(({ _id, name, departmentId, description, active }) => ({
      id: _id, name, department: byId.get(departmentId)?.name, description, active,
    })),
    complaints: complaints.map(complaintView),
    accounts: admins.map((admin) => ({
      label: admin.name, email: admin.email, role: admin.role,
      department: byId.get(admin.departmentId)?.name, firstLogin: admin.firstLogin,
    })),
  });
});

app.get('/api/complaints/:id', async (req, res) => {
  const item = await Complaint.findOne({ ...scope(req.user), code: req.params.id });
  if (!item) fail(404, 'Complaint unavailable.');
  res.json(complaintView(item));
});

app.post('/api/complaints', role('student'), async (req, res) => {
  const { title, description, categoryId, image } = req.body || {};
  const category = await Category.findOne({ _id: field(categoryId, 'Category', 100), active: true });
  const department = category && await Department.findOne({ _id: category.departmentId, active: true });
  if (!department) fail(400, 'Select an active complaint category.');
  if (image && (typeof image !== 'string' || image.length > 2100000 ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))) {
    fail(400, 'Attach a PNG, JPEG, or WebP image up to 1.5 MB.');
  }
  const at = new Date();
  const item = await Complaint.create({
    code: 'CC-' + randomBytes(5).toString('hex').toUpperCase(),
    title: field(title, 'Title', 160), description: field(description, 'Description', 5000, 15),
    category: category.name, department: department.name, departmentId: department.id,
    student: req.user.name, studentEmail: req.user.email, studentId: req.user._id,
    image: image || undefined,
    events: [
      { title: 'Submitted', detail: 'By ' + req.user.name, at },
      { title: 'Assigned to Department', detail: department.name, at },
    ],
  });
  res.status(201).json(complaintView(item));
});

app.patch('/api/complaints/:id/status', role('department'), async (req, res) => {
  const { status, remark = '' } = req.body || {};
  if (!['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(status)) fail(400, 'Select a valid status.');
  const note = field(remark, 'Remark', 2000, status === 'Rejected' ? 1 : 0);
  const filter = { ...scope(req.user), code: req.params.id };
  const current = await Complaint.findOne(filter);
  if (!current) fail(404, 'Complaint unavailable.');
  const update = { $set: {
    status, resolutionNote: status === 'Resolved' ? note : '', rejectionReason: status === 'Rejected' ? note : '',
  } };
  if (current.status !== status) {
    update.$push = { events: {
      title: ['Resolved', 'Rejected'].includes(status) ? status : 'Status Updated',
      detail: current.status + ' → ' + status,
      at: new Date(),
    } };
  }
  const item = await Complaint.findOneAndUpdate({ ...filter, status: current.status }, update, { returnDocument: 'after' });
  if (!item) fail(409, 'The complaint was updated elsewhere. Reopen it and try again.');
  res.json(complaintView(item));
});

app.post('/api/complaints/:id/replies', role('department'), async (req, res) => {
  const text = field(req.body?.text, 'Reply', 2000);
  const department = await Department.findById(req.user.departmentId);
  const author = department?.name || req.user.name;
  const at = new Date();
  const item = await Complaint.findOneAndUpdate({ ...scope(req.user), code: req.params.id }, {
    $push: { replies: { author, text, at }, events: { title: 'Reply Posted', detail: author, at } },
  }, { returnDocument: 'after' });
  if (!item) fail(404, 'Complaint unavailable.');
  res.status(201).json(complaintView(item));
});

app.put('/api/departments/:id', role('super'), async (req, res) => {
  const { name, description = '', active } = req.body || {};
  const label = field(name, 'Department name', 120);
  if (typeof active !== 'boolean') fail(400, 'Select a department status.');
  await Department.updateOne({ _id: req.params.id }, {
    $set: { name: label, key: label.toLowerCase(), description: field(description, 'Description', 500, 0), active },
  }, { upsert: true });
  res.json({ ok: true });
});

app.put('/api/categories/:id', role('super'), async (req, res) => {
  const { name, description = '', department, active } = req.body || {};
  const label = field(name, 'Category name', 120);
  const target = await Department.findOne({ name: field(department, 'Department', 120) });
  const existing = await Category.findById(req.params.id);
  if (!target || (!target.active && existing?.departmentId !== target.id)) {
    fail(400, 'Select an active department.');
  }
  if (typeof active !== 'boolean') fail(400, 'Select a category status.');
  await Category.updateOne({ _id: req.params.id }, {
    $set: { name: label, key: label.toLowerCase(), departmentId: target.id, description: field(description, 'Description', 500, 0), active },
  }, { upsert: true });
  res.json({ ok: true });
});

app.post('/api/admins', role('super'), async (req, res) => {
  const { name, email, department } = req.body || {};
  const target = await Department.findOne({ name: field(department, 'Department', 120), active: true });
  if (!target) fail(400, 'Select an active department.');
  const password = randomBytes(18).toString('base64url');
  const user = await User.create({
    name: field(name, 'Name', 100), email: emailField(email), departmentId: target.id,
    passwordHash: await bcrypt.hash(password, 12), role: 'department', firstLogin: true,
  });
  res.set('Cache-Control', 'no-store').status(201).json({ ...(await account(user)), password });
});

app.post('/api/admins/reset-password', role('super'), async (req, res) => {
  const email = emailField(req.body?.email);
  const password = randomBytes(18).toString('base64url');
  const user = await User.findOneAndUpdate({ email, role: 'department' }, {
    $set: { passwordHash: await bcrypt.hash(password, 12), firstLogin: true },
    $inc: { tokenVersion: 1 },
  }, { returnDocument: 'after' });
  if (!user) fail(404, 'Department admin unavailable.');
  res.set('Cache-Control', 'no-store').json({ ...(await account(user)), password });
});

app.use((req, res) => res.status(404).json({ message: 'Endpoint unavailable.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000) return res.status(409).json({ message: 'That name or email is already in use.' });
  if (error.status && error.status < 500) return res.status(error.status).json({
    message: error.type === 'entity.parse.failed' ? 'Send a valid JSON request.' : error.message,
  });
  return res.status(503).json({ message: 'CampusConnect could not complete the request. Check the server configuration and database connection.' });
});

module.exports = app;
if (require.main === module && !process.env.VERCEL) {
  connectDb().then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log('CampusConnect API running at http://localhost:' + port));
  }).catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exitCode = 1;
  });
}
