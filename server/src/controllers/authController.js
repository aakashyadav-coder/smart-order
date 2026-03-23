/**
 * Auth Controller — handles login and returns JWT
 */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.active) {
      return res.status(403).json({ message: "Account is deactivated. Contact the administrator." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, restaurantId: user.restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurantId },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ message: "Validation failed", errors: err.flatten().fieldErrors });
    }
    next(err);
  }
};

// Return current user info from token — verified from DB
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, restaurantId: true, active: true },
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.active) return res.status(403).json({ message: "Account is deactivated." });
    res.json(user);
  } catch (err) { next(err); }
};

module.exports = { login, me };
