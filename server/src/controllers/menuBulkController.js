/**
 * menuBulkController — Bulk menu upload via CSV / Excel
 * Super Admin only — parses file with xlsx, upserts or replaces menu items
 */
const { PrismaClient } = require("@prisma/client");
const xlsx = require("xlsx");
const { logActivity } = require("../services/activityLogService");

const prisma = new PrismaClient();

const MAX_ROWS = 500;

/**
 * Parse and validate a single row from the spreadsheet.
 * Returns { valid: true, data } or { valid: false, error }
 */
function parseRow(raw, rowIndex) {
  const name = (raw["name"] || raw["Name"] || "").toString().trim();
  const category = (raw["category"] || raw["Category"] || "").toString().trim();
  const rawPrice = raw["price"] || raw["Price"];
  const description = (raw["description"] || raw["Description"] || "").toString().trim() || null;
  const rawImageUrl = (raw["imageUrl"] || raw["image_url"] || raw["ImageUrl"] || "").toString().trim();
  const rawAvailable = raw["available"] ?? raw["Available"] ?? true;

  if (!name) return { valid: false, row: rowIndex, error: "Missing name" };
  if (!category) return { valid: false, row: rowIndex, error: "Missing category" };

  const price = parseFloat(rawPrice);
  if (isNaN(price) || price < 0) return { valid: false, row: rowIndex, error: `Invalid price: "${rawPrice}"` };

  let imageUrl = null;
  if (rawImageUrl) {
    if (!rawImageUrl.startsWith("http")) {
      return { valid: false, row: rowIndex, error: `imageUrl must start with http: "${rawImageUrl}"` };
    }
    imageUrl = rawImageUrl;
  }

  // Normalize available: accepts true/false/"true"/"false"/1/0/yes/no
  let available = true;
  const av = String(rawAvailable).toLowerCase().trim();
  if (av === "false" || av === "0" || av === "no") available = false;

  return {
    valid: true,
    data: { name, description, price, category, imageUrl, available },
  };
}

/**
 * GET /api/super/restaurants/:restaurantId/menu
 * Returns current menu items for preview (groupped by category)
 */
const getRestaurantMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, name: true } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });

    const items = await prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    res.json({ restaurant, items, total: items.length });
  } catch (err) { next(err); }
};

/**
 * POST /api/super/restaurants/:restaurantId/menu/bulk-upload
 * Body (multipart/form-data): file, mode ("add" | "replace")
 *
 * mode=add     → upsert by (name + category + restaurantId)
 * mode=replace → delete all menu items for restaurant, then insert fresh
 */
const bulkUploadMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const mode = (req.body?.mode || "add").toLowerCase(); // "add" | "replace"

    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    if (!["add", "replace"].includes(mode)) {
      return res.status(400).json({ message: 'mode must be "add" or "replace".' });
    }

    // Validate restaurant exists
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, name: true } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });

    // Parse the file buffer with xlsx (handles both csv and xlsx/xls)
    let workbook;
    try {
      workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    } catch {
      return res.status(400).json({ message: "Could not parse file. Please upload a valid CSV or Excel file." });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (rawRows.length === 0) {
      return res.status(400).json({ message: "The file is empty or has no data rows." });
    }
    if (rawRows.length > MAX_ROWS) {
      return res.status(400).json({ message: `File has ${rawRows.length} rows. Maximum allowed is ${MAX_ROWS}.` });
    }

    // Parse + validate each row
    const validItems = [];
    const errors = [];

    rawRows.forEach((raw, i) => {
      const result = parseRow(raw, i + 2); // row 2 = first data row (row 1 = header)
      if (result.valid) {
        validItems.push(result.data);
      } else {
        errors.push({ row: result.row, error: result.error });
      }
    });

    if (validItems.length === 0) {
      return res.status(400).json({
        message: "No valid rows found in file.",
        errors,
      });
    }

    let created = 0;
    let updated = 0;

    if (mode === "replace") {
      // Delete all existing menu items for this restaurant, then bulk-create
      await prisma.menuItem.deleteMany({ where: { restaurantId } });
      const result = await prisma.menuItem.createMany({
        data: validItems.map((item) => ({ ...item, restaurantId })),
      });
      created = result.count;
    } else {
      // Add/Upsert mode: match by (name + category + restaurantId)
      for (const item of validItems) {
        const existing = await prisma.menuItem.findFirst({
          where: {
            restaurantId,
            name: { equals: item.name, mode: "insensitive" },
            category: { equals: item.category, mode: "insensitive" },
          },
        });

        if (existing) {
          await prisma.menuItem.update({
            where: { id: existing.id },
            data: {
              description: item.description,
              price: item.price,
              imageUrl: item.imageUrl,
              available: item.available,
            },
          });
          updated++;
        } else {
          await prisma.menuItem.create({
            data: { ...item, restaurantId },
          });
          created++;
        }
      }
    }

    await logActivity({
      userId: req.user?.id,
      action: "MENU_BULK_UPLOAD",
      entity: "MenuItem",
      entityId: restaurantId,
      metadata: { mode, created, updated, errors: errors.length, totalRows: rawRows.length },
    });

    res.json({
      success: true,
      mode,
      restaurant: restaurant.name,
      summary: {
        totalRows: rawRows.length,
        validRows: validItems.length,
        created,
        updated,
        skipped: errors.length,
        errors,
      },
    });
  } catch (err) { next(err); }
};

/**
 * POST /api/super/menu/parse-preview
 * Parses uploaded file and returns row data WITHOUT saving.
 * Used by the frontend to preview Excel files (CSV is parsed client-side).
 */
const parseMenuPreview = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    let workbook;
    try {
      workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    } catch {
      return res.status(400).json({ message: "Could not parse file. Please upload a valid CSV or Excel file." });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (rawRows.length > MAX_ROWS) {
      return res.status(400).json({ message: `File has ${rawRows.length} rows. Maximum allowed is ${MAX_ROWS}.` });
    }

    const results = rawRows.map((raw, i) => parseRow(raw, i));
    res.json({ rows: results, total: rawRows.length });
  } catch (err) { next(err); }
};

module.exports = { bulkUploadMenu, getRestaurantMenu, parseMenuPreview };
