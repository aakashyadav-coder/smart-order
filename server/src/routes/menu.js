const { Router } = require("express");
const { getMenu } = require("../controllers/menuController");

const router = Router();

// GET /api/menu
router.get("/", getMenu);

module.exports = router;
