const express = require("express");
const router = express.Router();
const searchController = require("../controllers/search.controller");

// Định nghĩa route tìm kiếm
router.get("/", searchController.searchUser);

module.exports = router;
