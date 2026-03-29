/**
 * Seed script — Smart Order (Multi-tenant)
 * Creates:
 *  - 1 default restaurant "The Grand Kitchen"
 *  - 12 menu items linked to the default restaurant
 *  - Feature toggles for the restaurant
 *
 * Optional users (only created if env vars are provided):
 *  - SUPER_ADMIN via SEED_SUPER_EMAIL + SEED_SUPER_PASSWORD
 *  - OWNER via SEED_OWNER_EMAIL + SEED_OWNER_PASSWORD
 *  - KITCHEN via SEED_KITCHEN_EMAIL + SEED_KITCHEN_PASSWORD
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const prisma = new PrismaClient();

function readEnv(key) {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : null;
}

function requireEmailPassword(label, emailKey, passwordKey) {
  const email = readEnv(emailKey);
  const password = readEnv(passwordKey);
  if ((email && !password) || (!email && password)) {
    throw new Error(`${label}: set both ${emailKey} and ${passwordKey} to create this user.`);
  }
  if (!email) return null;
  return { email, password };
}

const menuItems = [
  // Drinks
  { name: "Masala Chai",      description: "Spiced Indian milk tea brewed with ginger and cardamom",           price: 60,  category: "Drinks",      imageUrl: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400" },
  { name: "Fresh Lime Soda",  description: "Refreshing lime soda with mint, sweet or salted",                  price: 80,  category: "Drinks",      imageUrl: "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400" },
  { name: "Mango Lassi",      description: "Chilled yogurt-based mango drink with a creamy texture",           price: 120, category: "Drinks",      imageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400" },
  // Starters
  { name: "Chicken Momo",     description: "Steamed dumplings filled with spiced minced chicken",              price: 180, category: "Starters",    imageUrl: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400" },
  { name: "Veg Spring Roll",  description: "Crispy rolls stuffed with seasoned mixed vegetables",               price: 130, category: "Starters",    imageUrl: "https://images.unsplash.com/photo-1548501037-4e8b79c3d4f5?w=400" },
  { name: "Chicken Tikka",    description: "Marinated chicken grilled in tandoor, served with mint chutney",   price: 280, category: "Starters",    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400" },
  // Main Course
  { name: "Butter Chicken",       description: "Tender chicken in a rich, creamy tomato-based sauce",          price: 320, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400" },
  { name: "Dal Makhani",          description: "Slow-cooked black lentils in a creamy tomato gravy",           price: 220, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400" },
  { name: "Paneer Butter Masala", description: "Cottage cheese cubes in a velvety tomato-cashew sauce",        price: 260, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400" },
  { name: "Chicken Biryani",      description: "Fragrant basmati rice with spiced chicken and caramelized onions", price: 350, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400" },
  // Desserts
  { name: "Gulab Jamun", description: "Soft milk-solid dumplings soaked in rose-flavored sugar syrup",         price: 90,  category: "Desserts",    imageUrl: "https://images.unsplash.com/photo-1601050690591-9557e0e0f0e0?w=400" },
  { name: "Kheer",       description: "Creamy rice pudding flavored with cardamom and garnished with nuts",    price: 100, category: "Desserts",    imageUrl: "https://images.unsplash.com/photo-1582490538568-bb1b2b3a6e6b?w=400" },
];

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ── Wipe existing data (order matters for FK constraints) ──────────────────
  await prisma.activityLog.deleteMany();
  await prisma.oTP.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.featureToggle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  // ── Super Admin (platform-level, no restaurant) ────────────────────────────
  const superInput = requireEmailPassword("SUPER_ADMIN", "SEED_SUPER_EMAIL", "SEED_SUPER_PASSWORD");
  const superName = readEnv("SEED_SUPER_NAME") || "Super Admin";
  let superAdmin = null;
  if (superInput) {
    const superHash = await bcrypt.hash(superInput.password, 10);
    superAdmin = await prisma.user.create({
      data: {
        name: superName,
        email: superInput.email,
        passwordHash: superHash,
        role: "SUPER_ADMIN",
      },
    });
    console.log("✅ Super Admin created");
  } else {
    console.log("ℹ️  Skipping Super Admin (set SEED_SUPER_EMAIL and SEED_SUPER_PASSWORD to create).");
  }

  // ── Default Restaurant ─────────────────────────────────────────────────────
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "The Grand Kitchen",
      address: "Kathmandu, Nepal",
      phone: "9800000000",
    },
  });
  console.log("✅ Restaurant:", restaurant.name);

  // ── Feature Toggles for restaurant ────────────────────────────────────────
  await prisma.featureToggle.create({
    data: {
      restaurantId: restaurant.id,
      otpEnabled: true,
      paymentsEnabled: false,
      notificationsEnabled: true,
    },
  });
  console.log("✅ Feature toggles created");

  // ── Owner ──────────────────────────────────────────────────────────────────
  const ownerInput = requireEmailPassword("OWNER", "SEED_OWNER_EMAIL", "SEED_OWNER_PASSWORD");
  const ownerName = readEnv("SEED_OWNER_NAME") || "Restaurant Owner";
  if (ownerInput) {
    const ownerHash = await bcrypt.hash(ownerInput.password, 10);
    await prisma.user.create({
      data: {
        name: ownerName,
        email: ownerInput.email,
        passwordHash: ownerHash,
        role: "OWNER",
        restaurantId: restaurant.id,
      },
    });
    console.log("✅ Owner created");
  } else {
    console.log("ℹ️  Skipping Owner (set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD to create).");
  }

  // ── Kitchen Staff ──────────────────────────────────────────────────────────
  const kitchenInput = requireEmailPassword("KITCHEN", "SEED_KITCHEN_EMAIL", "SEED_KITCHEN_PASSWORD");
  const kitchenName = readEnv("SEED_KITCHEN_NAME") || "Kitchen Staff";
  if (kitchenInput) {
    const kitchenHash = await bcrypt.hash(kitchenInput.password, 10);
    await prisma.user.create({
      data: {
        name: kitchenName,
        email: kitchenInput.email,
        passwordHash: kitchenHash,
        role: "KITCHEN",
        restaurantId: restaurant.id,
      },
    });
    console.log("✅ Kitchen user created");
  } else {
    console.log("ℹ️  Skipping Kitchen user (set SEED_KITCHEN_EMAIL and SEED_KITCHEN_PASSWORD to create).");
  }

  // ── Menu Items ─────────────────────────────────────────────────────────────
  for (const item of menuItems) {
    await prisma.menuItem.create({ data: { ...item, restaurantId: restaurant.id } });
  }
  console.log(`✅ ${menuItems.length} menu items created`);

  // ── Activity Log entry ─────────────────────────────────────────────────────
  if (superAdmin) {
    await prisma.activityLog.create({
      data: {
        userId: superAdmin.id,
        action: "SYSTEM_SEEDED",
        entity: "System",
        metadata: { note: "Initial database seed" },
      },
    });
  }

  console.log("\n🎉 Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Users are only created when SEED_* env vars are provided.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
