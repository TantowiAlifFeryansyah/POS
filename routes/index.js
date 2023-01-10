var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { isLoggedIn } = require('../helpers/util')

/* GET home page. */
module.exports = function (db) {
  router.get('/', function (req, res, next) {
    res.render('login', {
      successMessage: req.flash('successMessage'),
      failureMessage: req.flash('failureMessage')
    });
  });

  router.post('/', async function (req, res, next) {
    try {
      const { email, password } = req.body
      const {rows: datadb} = await db.query('SELECT * FROM users where email = $1', [email]);
      if (datadb.length == 0) {
        req.flash('failureMessage', 'email does not exist')
        return res.redirect('/')
      }

      const passcheck = bcrypt.compareSync(password, datadb[0].password);
      if (!passcheck) {
        req.flash('failureMessage', 'incorrect Password')
        return res.redirect('/')
      }

      const user = datadb[0]
      req.session.user = user

      res.redirect('/dashboard')
    } catch (error) {
      console.log('login error ', error);
    }
  });

  router.get('/register', function (req, res, next) {
    res.render('register', 
    {
      successMessage: req.flash('successMessage'),
      failureMessage: req.flash('failureMessage')
    })
  });

  router.post('/register', async function (req, res, next) {
    try {
      const { email, name, password, role } = req.body
      const datadb = await db.query('SELECT * FROM users where email = $1', [email])
      if (datadb.rows.length > 0) {
        req.flash('failureMessage', 'email already registered')
        return res.redirect('/register')
      }

      const hash = bcrypt.hashSync(password, saltRounds);
      await db.query("INSERT INTO users(email, name, password, role) VALUES ($1, $2, $3, $4)", [email, name, hash, role])
      res.redirect('/')
    } catch (error) {
      console.log('register error ', error);
    }
  });

  router.get('/logout',isLoggedIn,function (req, res, next) {
    req.session.destroy(function(err){
      res.redirect('/');
    })
  });

  return router;
}


