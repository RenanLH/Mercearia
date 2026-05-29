import Datastore from "@seald-io/nedb";
import { rm, rename } from "fs/promises";
import Product from "../Model/Product.js";
import Sale from "../Model/Sale.js";
import { isMongoOnline } from "../Util/Utilities.js";
import { fileURLToPath } from "url";

const salesDbPath = fileURLToPath(new URL("../LocalDB/sales.db", import.meta.url));
const salesTempDbPath = fileURLToPath(new URL("../LocalDB/sales_temp.db", import.meta.url));
const pendingSalesDbPath = fileURLToPath(new URL("../LocalDB/pending_sales.db", import.meta.url));

const localSalesDb = new Datastore({
  filename: salesDbPath,
  autoload: true,
});

const pendingSalesDb = new Datastore({
  filename: pendingSalesDbPath,
  autoload: true,
});



function parseTotal(total) {
  return Number(String(total).replace(",", ".")) || 0;
}

function buildSaleProducts(productList) {
  return productList.map((product) => ({
    name: product.name,
    barcode: product.barcode,
    qtd: product.qtd,
    price: product.price,
  }));
}

function sortSalesByDateDesc(sales) {
  return sales.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function getPendingSales(query) {
  await pendingSalesDb.autoloadPromise;
  return pendingSalesDb.findAsync(query);
}

function getSalesPage(sales, skip, limit) {
  const sortedSales = sortSalesByDateDesc(sales);

  return sortedSales.slice(skip, skip + limit);
}

function sumSalesTotal(sales) {
  return sales.reduce((total, sale) => total + parseTotal(sale.total), 0);
}

async function createSale(req, res) {
  try {
    const sale = req.body;
    const productSale = [];
    const dateNow = new Date();

    if (!(await isMongoOnline())) {
      await pendingSalesDb.autoloadPromise;
      await pendingSalesDb.insertAsync({
        total: sale.total,
        date: dateNow,
        products: buildSaleProducts(sale.productList),
      });

      return res.status(200).json("Success");
    }

    for (const product of sale.productList) {
      const productDb = await Product.findOne({ barcode: product.barcode });

      if (productDb) {
        productSale.push({
          id: String(productDb._id),
          qtd: product.qtd,
          name: product.name,
          barcode: product.barcode,
          price: product.price,
        });
      } else {
        productSale.push({
          name: product.name,
          qtd: product.qtd,
          price: product.price,
        });
      }
    }

    await Sale.create({
      total: sale.total,
      date: dateNow,
      products: productSale,
    });

    res.status(200).json("Success");
  } catch (error) {
    console.log(error);
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while creating the sale"));
  }
}

async function getSales(req, res) {
  try {
    const dateRequested = new Date(req.query.date);
    const limit = Number(req.query.limit) || 12;
    const skip = Number(req.query.skip) || 0;
    const dayBefore = new Date(dateRequested);
    dayBefore.setHours(0, 0, 0, 0);

    const query = {
      date: {
        $lt: dateRequested,
        $gte: dayBefore,
      },
    };

    if (!(await isMongoOnline())) {
      await localSalesDb.autoloadPromise;

      const localSales = await localSalesDb.findAsync(query);
      const pendingSales = await getPendingSales(query);
      const sales = [...localSales, ...pendingSales];

      return res.status(200).json({
        sales: getSalesPage(sales, skip, limit),
        numberSales: sales.length,
        dailyTotal: sumSalesTotal(sales),
      });
    }

    const numberSales = await Sale.countDocuments(query);

    const totalValue = await Sale.aggregate([
      {
        $match: {
          date: {
            $lt: dateRequested,
            $gte: dayBefore,
          },
        },
      },
      {
        $project: {
          totalAsNumber: {
            $toDouble: {
              $replaceAll: {
                input: "$total",
                find: ",",
                replacement: ".",
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          dailyTotal: { $sum: "$totalAsNumber" },
        },
      },
    ]);

    const dailyTotal = totalValue.length ? totalValue[0].dailyTotal : 0;
    const sales = await Sale.find(query)
      .sort({ date: -1 })
      .limit(skip + limit)
      .lean();
    const pendingSales = await getPendingSales(query);

    res.status(200).json({
      sales: getSalesPage([...sales, ...pendingSales], skip, limit),
      numberSales: numberSales + pendingSales.length,
      dailyTotal: dailyTotal + sumSalesTotal(pendingSales),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while fetching sales"));
  }
}

async function syncSalesToLocalDb(req, res) {
  try {
    const batchSize = 100;
    const cursor = Sale.find({}).sort({ _id: 1 }).lean().cursor({ batchSize });
    const tempSalesDb = new Datastore({ filename: salesTempDbPath });
    let batch = [];
    let synced = 0;

    await rm(salesTempDbPath, { force: true });
    await tempSalesDb.loadDatabaseAsync();

    for await (const sale of cursor) {
      batch.push({
        _id: String(sale._id),
        total: sale.total,
        date: sale.date,
        products: sale.products.map((product) => ({
          id: product.id ? String(product.id) : undefined,
          name: product.name,
          barcode: product.barcode,
          qtd: product.qtd,
          price: product.price,
        })),
      });

      if (batch.length === batchSize) {
        await tempSalesDb.insertAsync(batch);
        synced += batch.length;
        batch = [];
      }
    }

    if (batch.length) {
      await tempSalesDb.insertAsync(batch);
      synced += batch.length;
    }

    await rm(salesDbPath, { force: true });
    await rename(salesTempDbPath, salesDbPath);
    await localSalesDb.loadDatabaseAsync();

    res.status(200).json({ synced });
  } catch (error) {
    console.log(error);
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while syncing sales to local db"));
  }
}

export default { createSale, getSales, syncSalesToLocalDb };
