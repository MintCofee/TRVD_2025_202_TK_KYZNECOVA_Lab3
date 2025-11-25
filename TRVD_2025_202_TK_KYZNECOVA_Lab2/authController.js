const User = require("models/User");
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {
    const { username, password } = req.body;

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
        username,
        passwordHash,
        role: "user"
    });

    res.json({ message: "User registered", user: newUser.username });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "No such user" });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: "Invalid password" });

    req.session.userId = user._id;
    req.session.role = user.role;

    res.json({ message: "Logged in", role: user.role });
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
};
