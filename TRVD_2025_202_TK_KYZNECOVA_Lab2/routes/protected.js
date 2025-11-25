const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get("/profile", auth, (req, res) => {
    res.json({ message: "This is a profile page" });
});

router.get("/admin", auth, role("admin"), (req, res) => {
    res.json({ message: "Welcome admin" });
});

module.exports = router;
