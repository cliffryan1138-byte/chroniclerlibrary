#!/usr/bin/env node
// Generate a password hash for DASHBOARD_USERS.
//   npm run hash -- "their-password"

import { randomBytes, scryptSync } from 'crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash -- "the-password"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Use at least 8 characters.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
console.log(`scrypt$${salt}$${hash}`);
