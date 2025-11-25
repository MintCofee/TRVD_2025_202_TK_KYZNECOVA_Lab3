exports.requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};


exports.requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send("Доступ заборонено");
    }
    next();
};
module.exports = function (req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    next();
};
