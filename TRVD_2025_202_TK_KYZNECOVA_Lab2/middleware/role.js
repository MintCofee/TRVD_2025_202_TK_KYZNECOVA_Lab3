module.exports = function (requiredRole) {
    return function (req, res, next) {
        if (req.session.role !== requiredRole) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};
