module.exports = {
    isLoggedIn: function(req, res ,next) {
        // console.log('user ', req.session.user);
       if(req.session.user) {
        return next()
       }
       res.redirect('/')
    },

    isAdmin: function(req, res ,next) {
        // console.log('user ', req.session.user);
       if(req.session.user && req.session.user.role == 'Admin') {
        return next()
       }
       res.redirect('/sales')
    }
}