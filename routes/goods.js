var express = require('express');
var router = express.Router();
const { isAdmin } = require('../helpers/util')
var path = require('path')

/* GET home page. */
module.exports = function (db) {
  router.get('/', isAdmin, function (req, res, next) {
    res.render('goods/list', 
    { 
      user: req.session.user,
      currentPage: 'POS - Goods'
    });
  });

  router.get('/datatable', async (req, res) => {
    let params = []

    if (req.query.search.value) {
      params.push(`name ilike '%${req.query.search.value}%'`)
    }

    if (req.query.search.value) {
      params.push(`unit ilike '%${req.query.search.value}%'`)
    }

    if (req.query.search.value) {
      params.push(`purchaseprice ilike '%${req.query.search.value}%'`)
    }

    if (req.query.search.value) {
      params.push(`sellingprice ilike '%${req.query.search.value}%'`)
    }

    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir

    const total = await db.query(`select count(*) as total from goods${params.length > 0 ? ` where ${params.join(' or ')}` : ''}`)
    const data = await db.query(`select * from goods${params.length > 0 ? ` where ${params.join(' or ')}` : ''} order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `)
    const response = {
      "draw": Number(req.query.draw),
      "recordsTotal": total.rows[0].total,
      "recordsFiltered": total.rows[0].total,
      "data": data.rows
    }
    res.json(response)
  })

  router.get('/add', isAdmin, async function (req, res, next) {
    const { rows: dataUnit } = await db.query("SELECT * FROM units")
    res.render('goods/add',
    {
    data: dataUnit,
    user: req.session.user,
    currentPage: 'POS - Goods',
    successMessage: req.flash('successMessage'),
    failureMessage: req.flash('failureMessage')
  });
  });

  router.post('/add', isAdmin, async function (req, res, next) {
    try {
      const { barcode, name, stock, purchaseprice, sellingprice, unit } = req.body
      const datadb = await db.query('SELECT * FROM goods WHERE barcode = $1', [barcode])

      if (datadb.rows.length > 0) {
        req.flash('failureMessage', 'barcode already')
        return res.redirect('/goods/add')
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        res.status(400).send('No files were uploaded.');
        return;
      }

      const uploadFile = req.files.picture;
      // tujuan di concat dengan Date now supaya file tidak bertumpuk
      const fileName = `${Date.now()}-${uploadFile.name}`
      // tujuan untuk menyimpan file upload
      const uploadPath = path.join(__dirname, '..', 'public', 'images', 'upload', fileName);

      uploadFile.mv(uploadPath, async function (err) {
        if (err) {
          return res.status(500).send(err);
        }
        await db.query("INSERT INTO goods(barcode, name, stock, purchaseprice, sellingprice, unit, picture) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [barcode, name, stock, purchaseprice, sellingprice, unit, fileName])
        res.redirect('/goods')
      });
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.get('/edit/:barcode', isAdmin, async function (req, res, next) {
    try {
      const index = req.params.barcode
      const { rows: dataEdit } = await db.query("SELECT * FROM goods WHERE barcode = $1", [index])
      const { rows: dataUnit } = await db.query("SELECT * FROM units")
      res.render('goods/edit',
      {
      data: dataEdit[0],
      unitData: dataUnit,
      user: req.session.user,
      currentPage: 'POS - Units'
    });
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.post('/edit/:barcode', isAdmin, async function (req, res, next) {
    try {
        const index = req.params.barcode
        const { name, stock, purchaseprice, sellingprice, unit } = req.body
        
        if (!req.files || Object.keys(req.files).length === 0) {
          await db.query("UPDATE goods SET name = $1, stock = $2, purchaseprice = $3, sellingprice = $4, unit = $5 WHERE barcode = $6",
          [name, stock, purchaseprice, sellingprice, unit, index])
          res.redirect('/goods')
          return;
        } else {
            const uploadFile = req.files.picture;
            const fileName = `${Date.now()}-${uploadFile.name}`
            const uploadPath = path.join(__dirname, '..', 'public', 'images', 'upload', fileName);

            uploadFile.mv(uploadPath, async function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
                await db.query("UPDATE goods SET name = $1, stock = $2, purchaseprice = $3, sellingprice = $4, unit = $5, picture = $6 WHERE barcode = $7",
                [name, stock, purchaseprice, sellingprice, unit, fileName, index])
                res.redirect('/goods')
            })
          }
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  router.get('/delete/:barcode', isAdmin, async function (req, res, next) {
    try {
      const index = req.params.barcode
      await db.query("DELETE FROM goods WHERE barcode = $1", [index])
      res.redirect('/goods')
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  });

  return router;
}