var express = require('express');
var router = express.Router();
const { isLoggedIn } = require('../helpers/util')
const moment = require('moment')

/* GET home page. */
module.exports = function (db) {
  router.get('/', isLoggedIn, async function (req, res, next) {
    try {
      const {rows : dataDb } = await db.query('SELECT * FROM purchases')
      console.log('ini data ', dataDb[0]);
      res.render('purchases/list',{
        data : dataDb[0],
        user: req.session.user,
        currentPage: "POS - Purchases",
      })
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  })

  router.get('/datatable', async (req, res) => {
    let params = []

    if(req.query.search.value){
        params.push(`invoice ilike '%${req.query.search.value}%'`)
    }

    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir

    const total = await db.query(`select count(*) as total from purchases${params.length > 0 ? ` where ${params.join(' or ')}` : ''}`)
    const data = await db.query(`select purchases.*, suppliers.* from purchases left join suppliers on purchases.supplier = suppliers.supplierid${params.length > 0 ? ` where ${params.join(' or ')}` : ''} order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `)
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
      const { rows } = await db.query('INSERT INTO purchases(totalsum) VALUES(0) returning *')
      res.redirect(`/purchases/show/${rows[0].invoice}`)
    } catch (error) {
      console.log(error); 
      res.send(error)
    }
  });

  router.get('/show/:invoice', isLoggedIn, async function (req, res, next) {
    try {
      const getpurchases = await db.query('SELECT purchases.*, suppliers.* FROM purchases LEFT JOIN suppliers ON purchases.supplier = suppliers.supplierid WHERE invoice = $1', [req.params.invoice])
      const getgoods = await db.query('SELECT * FROM goods ORDER BY barcode')
      const getsupplier = await db.query('SELECT * FROM suppliers ORDER BY supplierid')
      res.render(`purchases/form`,{
        user: req.session.user, 
        currentPage: 'POS - Purchases',
        purchases: getpurchases.rows[0],
        goods: getgoods.rows,
        suppliers: getsupplier.rows,
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
      const { totalsummary, supplier} = req.body
      const userid  = req.session.user.userid

      if (!supplier){
        await db.query('UPDATE purchases SET totalsum = $1, operator = $2 WHERE invoice = $3', [totalsummary, userid, invoice])
      } else {
        await db.query('UPDATE purchases SET totalsum = $1, supplier = $2, operator = $3 WHERE invoice = $4', [totalsummary, supplier, userid, invoice])
      }
      
      res.redirect(`/purchases`)
    } catch (error) {
      console.log(error); 
      res.send(error)
    }
  });

  router.get('/goods/:barcode', isLoggedIn, async function (req, res, next) {
    try {
      const { rows } = await db.query(`SELECT * FROM goods WHERE barcode = $1`,[req.params.barcode])
      res.json(rows[0])
    } catch (error) {
      console.log(error); 
      res.send(error)
    }
  });

  router.post('/additem', isLoggedIn, async function (req, res, next) {
    try {
      await db.query(`INSERT INTO purchaseitems (invoice, itemcode, quantity) VALUES($1, $2, $3) returning *`,[req.body.invoice, req.body.barcode, req.body.quantity])
      const { rows } = await db.query('SELECT * FROM purchases WHERE invoice = $1', [req.body.invoice])
      res.json(rows[0])
    } catch (error) {
      console.log(error); 
      res.send(error)
    }
  });

  router.get('/details/:invoice', isLoggedIn, async function (req, res, next) {
    try {
      const { rows } = await db.query(`SELECT purchaseitems.* , goods.name FROM purchaseitems LEFT JOIN goods ON purchaseitems.itemcode = goods.barcode WHERE purchaseitems.invoice = $1 ORDER BY purchaseitems.id`,[req.params.invoice])
      res.json(rows)
    } catch (error) {
      console.log(error); 
      res.send(error)
    }
  });

  router.get('/delete/:invoice', isLoggedIn, async function (req, res, next) {
    try {
     const invoice = req.params.invoice
     await db.query(`DELETE FROM purchases WHERE invoice = $1`, [invoice])
      res.redirect('/purchases')
    } catch (error) {
      console.log(error); 
      res.send(error)
    }
  });

  router.get('/deleteitems/:id', isLoggedIn, async function (req, res, next) {
    try {
     const { id } = req.params
     const { rows } = await db.query(`DELETE FROM purchaseitems WHERE id = $1 returning *`, [id])
      res.redirect(`/purchases/show/${rows[0].invoice}`)
    } catch (error) {
      console.log(error); 
      res.send(error)
    }
  });

  return router;
}