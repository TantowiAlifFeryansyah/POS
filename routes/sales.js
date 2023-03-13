var express = require('express');
var router = express.Router();
const { isLoggedIn } = require('../helpers/util')
const moment = require('moment')

/* GET home page. */
module.exports = function (db) {
  router.get('/', isLoggedIn, async function (req, res, next) {
    try {
      const { rows: dataDb } = await db.query('SELECT * FROM sales')
      res.render('sales/list', {
        data: dataDb[0],
        user: req.session.user,
        currentPage: "POS - Sales",
      })
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  })

  router.get('/datatable', async (req, res) => {
    let params = []

    if (req.query.search.value) {
      params.push(`invoice ilike '%${req.query.search.value}%'`)
    }

    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir

    const total = await db.query(`select count(*) as total from sales${params.length > 0 ? ` where ${params.join(' or ')}` : ''}`)
    const data = await db.query(`select sales.*, customers.* from sales left join customers on sales.customer = customers.customerid${params.length > 0 ? ` where ${params.join(' or ')}` : ''} order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `)
    const response = {
      "draw": Number(req.query.draw),
      "recordsTotal": total.rows[0].total,
      "recordsFiltered": total.rows[0].total,
      "data": data.rows
    }
    res.json(response)
  })

  router.get('/create', isLoggedIn, async function (req, res, next) {
    try {
      const { rows } = await db.query('INSERT INTO sales(totalsum) VALUES(0) returning *')
      res.redirect(`/sales/show/${rows[0].invoice}`)
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.get('/show/:invoice', isLoggedIn, async function (req, res, next) {
    try {
      const getsales = await db.query('SELECT sales.*, customers.* FROM sales LEFT JOIN customers ON sales.customer = customers.customerid WHERE invoice = $1', [req.params.invoice])
      const getgoods = await db.query('SELECT * FROM goods ORDER BY barcode')
      const getcustomer = await db.query('SELECT * FROM customers ORDER BY customerid')
      res.render(`sales/form`, {
        user: req.session.user,
        currentPage: 'POS - Sales',
        sales: getsales.rows[0],
        goods: getgoods.rows,
        customers: getcustomer.rows,
        moment
      })
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.post('/show/:invoice', isLoggedIn, async function (req, res, next) {
    try {
      const { invoice } = req.params
      const { totalsummary, customer, pay, change } = req.body
      const userid = req.session.user.userid

      if (!customer) {
        await db.query('UPDATE sales SET totalsum = $1, operator = $2, pay = $3, change = $4 WHERE invoice = $5', [totalsummary, userid, pay, change, invoice])
      } else {
        await db.query('UPDATE sales SET totalsum = $1, customer = $2, operator = $3, pay = $4, change = $5 WHERE invoice = $6', [totalsummary, customer, userid, pay, change, invoice])
      }

      res.redirect(`/sales`)
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.get('/goods/:barcode', isLoggedIn, async function (req, res, next) {
    try {
      const { rows } = await db.query(`SELECT * FROM goods WHERE barcode = $1`, [req.params.barcode])
      res.json(rows[0])
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.post('/additem', isLoggedIn, async function (req, res, next) {
    try {
      await db.query(`INSERT INTO saleitems (invoice, itemcode, quantity) VALUES($1, $2, $3) returning *`, [req.body.invoice, req.body.barcode, req.body.quantity])
      const { rows } = await db.query('SELECT * FROM sales WHERE invoice = $1', [req.body.invoice])
      res.json(rows[0])
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.get('/details/:invoice', isLoggedIn, async function (req, res, next) {
    try {
      const { rows } = await db.query(`SELECT saleitems.* , goods.name FROM saleitems LEFT JOIN goods ON saleitems.itemcode = goods.barcode WHERE saleitems.invoice = $1 ORDER BY saleitems.id`, [req.params.invoice])
      res.json(rows)
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.get('/delete/:invoice', isLoggedIn, async function (req, res, next) {
    try {
      const invoice = req.params.invoice
      await db.query(`DELETE FROM sales WHERE invoice = $1`, [invoice])
      res.redirect('/sales')
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.get('/deleteitems/:id', isLoggedIn, async function (req, res, next) {
    try {
      const { id } = req.params
      const { rows } = await db.query(`DELETE FROM saleitems WHERE id = $1 returning *`, [id])
      res.redirect(`/sales/show/${rows[0].invoice}`)
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  return router;
}