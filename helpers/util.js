module.exports = {
    isLoggedIn: function (req, res, next) {
        if (req.session.user) {
            return next()
        }
        res.redirect('/')
    },

    isAdmin: function (req, res, next) {
        if (req.session.user && req.session.user.role == 'Admin') {
            return next()
        }
        res.redirect('/sales')
    }
}