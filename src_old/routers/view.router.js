const express = require("express")
const router = express.Router()
const {
    renderChat
} = require("../controllers/view.controller")

// Route hiển thị trang đăng nhập
router.get("/", (req, res) => {
    res.render("login"); // Hiển thị file login.ejs
});

// Route hiển thị trang đăng nhập với đường dẫn cụ thể
router.get("/login", (req, res) => {
    res.render("login"); // Hiển thị file login.ejs
});

// Route hiển thị trang đăng ký
router.get("/register", (req, res) => {
    res.render("register"); // Hiển thị file register.ejs
});

router
    .route("/chat")
    .get(renderChat)
module.exports = router