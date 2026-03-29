const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return null;
  return next;
}

async function main() {
  const email = getArgValue('--email') || process.env.SUPER_ADMIN_EMAIL;
  const password = getArgValue('--password') || process.env.SUPER_ADMIN_PASSWORD;
  const name = getArgValue('--name') || process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('Missing credentials. Provide --email and --password, or set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in the environment.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      active: true,
      name
    },
    create: {
      name,
      email,
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      active: true
    }
  });

  console.log('SUCCESS: Super admin created or updated!');
  console.log('User ID:', superAdmin.id);
  console.log('Email:', superAdmin.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
