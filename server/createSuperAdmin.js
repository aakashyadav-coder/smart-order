const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('superadmin123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@smartorder.com' },
    update: {
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      active: true,
      name: 'Super Admin'
    },
    create: {
      name: 'Super Admin',
      email: 'super@smartorder.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      active: true
    }
  });

  console.log('SUCCESS: Super admin created or updated!');
  console.log('Email:', superAdmin.email);
  console.log('Password:', 'superadmin123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
