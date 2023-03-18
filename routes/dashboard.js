var express = require('express');
var router = express.Router();
const { isAdmin } = require('../helpers/util')
const currencyFormatter = require('currency-formatter');

/* GET home page. */
module.exports = function (db) {
  router.get('/', isAdmin, async function (req, res, next) {
    try {
      const { startdate, enddate } = req.query
      let totalpurchases = ''
      let totalsales = ''
      let totalinvoice = ''

      if (!startdate && !enddate) {
        const { rows: purchasestotal } = await db.query(`SELECT sum(totalsum) AS totalpurchases FROM purchases`)
        totalpurchases = purchasestotal
        const { rows: salestotal } = await db.query(`SELECT sum(totalsum) AS totalsales FROM sales`)
        totalsales = salestotal
        const { rows: invoicetotal } = await db.query(`SELECT count(invoice) AS totalinvoice FROM sales`)
        totalinvoice = invoicetotal
      } else if (startdate != '' && enddate != '') {
        const { rows: purchasestotal } = await db.query(`SELECT sum(totalsum) AS totalpurchases FROM purchases WHERE time >= $1 AND time <= $2`, [startdate, enddate])
        totalpurchases = purchasestotal
        const { rows: salestotal } = await db.query(`SELECT sum(totalsum) AS totalsales FROM sales WHERE time >= $1 AND time <= $2`, [startdate, enddate])
        totalsales = salestotal
        const { rows: invoicetotal } = await db.query(`SELECT count(invoice) AS totalinvoice FROM sales WHERE time >= $1 AND time <= $2`, [startdate, enddate])
        totalinvoice = invoicetotal
      } else if (startdate != '') {
        const { rows: purchasestotal } = await db.query(`SELECT sum(totalsum) AS totalpurchases FROM purchases WHERE time >= $1`, [startdate])
        totalpurchases = purchasestotal
        const { rows: salestotal } = await db.query(`SELECT sum(totalsum) AS totalsales FROM sales WHERE time >= $1`, [startdate])
        totalsales = salestotal
        const { rows: invoicetotal } = await db.query(`SELECT count(invoice) AS totalinvoice FROM sales WHERE time >= $1`, [startdate])
        totalinvoice = invoicetotal
      } else if (enddate != '') {
        const { rows: purchasestotal } = await db.query(`SELECT sum(totalsum) AS totalpurchases FROM purchases WHERE time <= $1`, [enddate])
        totalpurchases = purchasestotal
        const { rows: salestotal } = await db.query(`SELECT sum(totalsum) AS totalsales FROM sales WHERE time <= $1`, [enddate])
        totalsales = salestotal
        const { rows: invoicetotal } = await db.query(`SELECT count(invoice) AS totalinvoice FROM sales WHERE time <= $1`, [enddate])
        totalinvoice = invoicetotal
      }

      let totalearnings = totalsales[0].totalsales - totalpurchases[0].totalpurchases

      let purchasesget = ''
      let salesget = ''

      if (!startdate && !enddate) {
        const { rows: getpurchases } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases GROUP BY bulan, tanggal ORDER BY tanggal`)
        purchasesget = getpurchases
        const { rows: getsales } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales GROUP BY bulan, tanggal ORDER BY tanggal`)
        salesget = getsales
      } else if (startdate != '' && enddate != '') {
        const { rows: getpurchases } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases WHERE time BETWEEN $1 AND $2 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate, enddate])
        purchasesget = getpurchases
        const { rows: getsales } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales WHERE time BETWEEN $1 AND $2 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate, enddate])
        salesget = getsales
      } else if (startdate != '') {
        const { rows: getpurchases } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases WHERE time >= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate])
        purchasesget = getpurchases
        const { rows: getsales } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales WHERE time >= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate])
        salesget = getsales
      } else if (enddate != '') {
        const { rows: getpurchases } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases WHERE time <= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [enddate])
        purchasesget = getpurchases
        const { rows: getsales } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales WHERE time <= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [enddate])
        salesget = getsales
      }

      let total = purchasesget.concat(salesget)
      let data = {}
      let subtotal = []

      total.forEach(item => {
        if (data[item.bulan]) {
          data[item.bulan] = { monthly: item.bulan, expense: item.jumlahpurchases ? item.jumlahpurchases : data[item.bulan].expense, revenue: item.jumlahsales ? item.jumlahsales : data[item.bulan].revenue }
        }
        else {
          data[item.bulan] = { monthly: item.bulan, expense: item.jumlahpurchases ? item.jumlahpurchases : 0, revenue: item.jumlahsales ? item.jumlahsales : 0 }
        }
      })

      for (const item in data) {
        subtotal.push({
          monthly: data[item].monthly,
          expense: data[item].expense,
          revenue: data[item].revenue
        })
      }

      res.render('dashboard/list', {
        purchases: totalpurchases[0],
        sales: totalsales[0],
        invoice: totalinvoice[0],
        totalearnings,
        user: req.session.user,
        currentPage: "POS - Dashboard",
        currencyFormatter,
        subtotal,
        query: req.query
      })
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  })

  router.get('/line', isAdmin, async function (req, res, next) {
    try {
      const { startdate, enddate } = req.query
      let searchPurchase = ''
      let searchSales = ''

      if (startdate != '' && enddate != '') {
        const { rows: purchasesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases WHERE time BETWEEN $1 AND $2 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate, enddate])
        searchPurchase = purchasesget
        const { rows: salesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales WHERE time BETWEEN $1 AND $2 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate, enddate])
        searchSales = salesget
      } else if (startdate != '') {
        const { rows: purchasesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases WHERE time >= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate])
        searchPurchase = purchasesget
        const { rows: salesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales WHERE time >= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [startdate])
        searchSales = salesget
      } else if (enddate != '') {
        const { rows: purchasesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases WHERE time <= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [enddate])
        searchPurchase = purchasesget
        const { rows: salesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales WHERE time <= $1 GROUP BY bulan, tanggal ORDER BY tanggal`, [enddate])
        searchSales = salesget
      } else {
        const { rows: purchasesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahpurchases From purchases GROUP BY bulan, tanggal ORDER BY tanggal`)
        searchPurchase = purchasesget
        const { rows: salesget } = await db.query(`SELECT to_char(time, 'Mon YY') AS bulan, to_char(time, 'YY-MM') AS tanggal, sum(totalsum) AS jumlahsales From sales GROUP BY bulan, tanggal ORDER BY tanggal`)
        searchSales = salesget
      }

      let total = searchPurchase.concat(searchSales)
      let data = {}
      let subtotal = []

      let hasil = []
      let bulan = []

      total.forEach(item => {
        if (data[item.bulan]) {
          data[item.bulan] = { monthly: item.bulan, expense: item.jumlahpurchases ? item.jumlahpurchases : data[item.bulan].expense, revenue: item.jumlahsales ? item.jumlahsales : data[item.bulan].revenue }
        } else {
          data[item.bulan] = { monthly: item.bulan, expense: item.jumlahpurchases ? item.jumlahpurchases : 0, revenue: item.jumlahsales ? item.jumlahsales : 0 }
          bulan.push(item.bulan)
        }
      })

      for (const item in data) {
        subtotal.push({
          monthly: data[item].monthly,
          expense: data[item].expense,
          revenue: data[item].revenue
        })
      }

      for (const item in data) {
        hasil.push(data[item].revenue - data[item].expense)
      }

      res.json({ bulan, hasil })
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  })

  router.get('/dougnat', isAdmin, async function (req, res, next) {
    try {
      const { startdate, enddate } = req.query

      if (startdate != '' && enddate != '') {
        const { rows: general } = await db.query('SELECT COUNT(*) FROM sales WHERE customer = 2 AND time BETWEEN $1 AND $2', [startdate, enddate])
        const { rows: members } = await db.query('SELECT COUNT(*) FROM sales WHERE customer != 2 AND time BETWEEN $1 AND $2', [startdate, enddate])
        res.json({ general: general[0].count, members: members[0].count })
      } else if (startdate != '') {
        const { rows: general } = await db.query('SELECT COUNT(*) FROM sales WHERE customer = 2 AND time >= $1', [startdate])
        const { rows: members } = await db.query('SELECT COUNT(*) FROM sales WHERE customer != 2 AND time >= $1', [startdate])
        res.json({ general: general[0].count, members: members[0].count })
      } else if (enddate != '') {
        const { rows: general } = await db.query('SELECT COUNT(*) FROM sales WHERE customer = 2 AND time <= $1', [enddate])
        const { rows: members } = await db.query('SELECT COUNT(*) FROM sales WHERE customer != 2 AND time <= $1', [enddate])
        res.json({ general: general[0].count, members: members[0].count })
      } else {
        const { rows: general } = await db.query('SELECT COUNT(*) FROM sales WHERE customer = 2')
        const { rows: members } = await db.query('SELECT COUNT(*) FROM sales WHERE customer != 2')
        res.json({ general: general[0].count, members: members[0].count })
      }

    } catch (error) {
      console.log(error);
      res.send(error)
    }
  })

  return router;
}