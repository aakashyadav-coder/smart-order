/**
 * Seed script — populates the database with:
 *  - 1 admin user  (admin@restaurant.com / admin123)
 *  - 1 kitchen user (kitchen@restaurant.com / kitchen123)
 *  - Sample menu items across 4 categories
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const menuItems = [
  // Drinks
  {
    name: "Masala Chai",
    description: "Spiced Indian milk tea brewed with ginger and cardamom",
    price: 60,
    category: "Drinks",
    imageUrl: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400",
  },
  {
    name: "Fresh Lime Soda",
    description: "Refreshing lime soda with mint, sweet or salted",
    price: 80,
    category: "Drinks",
    imageUrl: "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400",
  },
  {
    name: "Mango Lassi",
    description: "Chilled yogurt-based mango drink with a creamy texture",
    price: 120,
    category: "Drinks",
    imageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400",
  },
  // Starters
  {
    name: "Chicken Momo",
    description: "Steamed dumplings filled with spiced minced chicken",
    price: 180,
    category: "Starters",
    imageUrl: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400",
  },
  {
    name: "Veg Spring Roll",
    description: "Crispy rolls stuffed with seasoned mixed vegetables",
    price: 130,
    category: "Starters",
    imageUrl: "https://images.unsplash.com/photo-1548501037-4e8b79c3d4f5?w=400",
  },
  {
    name: "Chicken Tikka",
    description: "Marinated chicken chunks grilled in tandoor, served with mint chutney",
    price: 280,
    category: "Starters",
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400",
  },
  // Main Course
  {
    name: "Butter Chicken",
    description: "Tender chicken in a rich, creamy tomato-based sauce",
    price: 320,
    category: "Main Course",
    imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400",
  },
  {
    name: "Dal Makhani",
    description: "Slow-cooked black lentils in a creamy tomato gravy",
    price: 220,
    category: "Main Course",
    imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400",
  },
  {
    name: "Paneer Butter Masala",
    description: "Cottage cheese cubes in a velvety tomato-cashew sauce",
    price: 260,
    category: "Main Course",
    imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400",
  },
  {
    name: "Chicken Biryani",
    description: "Fragrant basmati rice cooked with spiced chicken and caramelized onions",
    price: 350,
    category: "Main Course",
    imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400",
  },
  // Desserts
  {
    name: "Gulab Jamun",
    description: "Soft milk-solid dumplings soaked in rose-flavored sugar syrup",
    price: 90,
    category: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1601050690591-9557e0e0f0e0?w=400",
  },
  {
    name: "Kheer",
    description: "Creamy rice pudding flavored with cardamom and garnished with nuts",
    price: 100,
    category: "Desserts",
    imageUrl: "https://images.unsplash.com/photo-1582490538568-bb1b2b3a6e6b?w=400",
  },
];

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  await prisma.oTP.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@restaurant.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // Create kitchen user
  const kitchenHash = await bcrypt.hash("kitchen123", 10);
  const kitchen = await prisma.user.create({
    data: {
      name: "Kitchen Staff",
      email: "kitchen@restaurant.com",
      passwordHash: kitchenHash,
      role: "KITCHEN",
    },
  });
  console.log("✅ Created kitchen user:", kitchen.email);

  // Create menu items
  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }
  console.log(`✅ Created ${menuItems.length} menu items`);

  console.log("\n🎉 Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Admin login:   admin@restaurant.com  /  admin123");
  console.log("Kitchen login: kitchen@restaurant.com / kitchen123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
