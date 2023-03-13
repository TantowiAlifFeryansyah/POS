var express = require('express');
var router = express.Router();

const { isLoggedIn } = require('../helpers/util')

/* GET home page. */
module.exports = function (db) {
    router.get('/', isLoggedIn, async (req, res, next) => {
        try {
            const { rows: alert } = await db.query('SELECT barcode, name, stock FROM goods WHERE stock <= 5')
            res.json(alert)
        } catch (err) {
            res.send(err)
        }
    });

    router.get('/count', isLoggedIn, async (req, res, next) => {
        try {
            const { rows: notififsum } = await db.query('SELECT COUNT(*) FROM goods WHERE stock <= 5')

            res.json(notififsum)
        } catch (err) {
            res.send(err)
        }
    });

    return router;
}