const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDb = require('./db');
const { Department, Category, User } = require('./models');

const defaults = [
  ['cafeteria', 'Cafeteria Administration', 'Cafeteria'],
  ['library', 'Library Administration', 'Library'],
  ['labs-it', 'Laboratory / IT Administration', 'Laboratories & IT Facilities'],
  ['academic', 'Teaching Manager / Academic Coordination', 'Teaching & Academic Affairs'],
];

async function seed() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Set a valid SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of 12+ characters and at most 72 bytes.');
  }
  await connectDb();
  const existing = await User.findOne({ email });
  if (existing && existing.role !== 'super') throw new Error('That email already belongs to a non-admin account.');
  if (!(await User.exists({ role: 'super' }))) {
    await User.create({ name: 'Super Administrator', email, role: 'super', passwordHash: await bcrypt.hash(password, 12) });
  } else if (!existing) {
    throw new Error('A super administrator already exists. Use its email to rerun the seed.');
  }
  for (const [slug, department, category] of defaults) {
    await Department.updateOne({ _id: 'dept-' + slug }, {
      $setOnInsert: { name: department, key: department.toLowerCase(), active: true },
    }, { upsert: true });
    await Category.updateOne({ _id: 'cat-' + slug }, {
      $setOnInsert: { name: category, key: category.toLowerCase(), departmentId: 'dept-' + slug, active: true },
    }, { upsert: true });
  }
  console.log('CampusConnect departments, categories, and super admin are ready.');
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
