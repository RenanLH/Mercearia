import Datastore from "@seald-io/nedb";
import { rm, rename } from "fs/promises";
import mongoose from "mongoose";
import Product from "../Model/Product.js";
import { isMongoOnline } from "../Util/Utilities.js"
import { fileURLToPath } from "url";

const productsDbPath = fileURLToPath(new URL("../LocalDB/products.db", import.meta.url));
const productsTempDbPath = fileURLToPath(new URL("../LocalDB/products_temp.db", import.meta.url));

const localProductsDb = new Datastore({
  filename: productsDbPath,
  autoload: true,
});

async function productExists(req, res) {
  try {
    const barcode = req.query.codBarras;

    const productDb = await Product.findOne({ barcode });

    res.status(200).json(productDb);

  } catch (error) {
    console.log(error);
    res.status(405).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while checking if the product exists"));
  }
};


async function createProduct(req, res) {
  try {
    const product = req.body;
    const dateNow = new Date();

    await Product.create({
      barcode:product.barcode,
      name: product.name,
      qtd: product.qtd,
      price: product.price,
      lastUpdated: dateNow
    });

    res.status(200).json("Success");

  } catch (error) {
    console.log(error);
    res.status(405).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while creating the product"));
  }
};



async function editProduct(req, res) {
  try {
    const product = req.body;
    const dateNow = new Date();

    await Product.findOneAndUpdate({
      barcode: String(product.barcode)
    },
      {
        name: product.name,
        qtd: product.qtd,
        price: product.price,
        lastUpdated: dateNow
      });

    res.status(200).json("Success");

  } catch (error) {
    console.log(error);
    res.status(405).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while editing the product"));
  }
};

async function getProduct(req, res) {
  try {
    const barcode = req.query.codBarras;
    let productDb;
    
    if (await isMongoOnline()) {
      productDb = await Product.findOne({ barcode }).select('-_id');
    } else {
      await localProductsDb.autoloadPromise;
      productDb = await localProductsDb.findOneAsync({ barcode }, { _id: 0 });
    }

    res.status(200).json(productDb);

  } catch (error) {
    console.log(error);
    res.status(405).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while fetching the product"));
  }
};

async function syncProductsToLocalDb(req, res) {
  try {
    const batchSize = 100;
    const cursor = Product.find({}).sort({ _id: 1 }).lean().cursor({ batchSize });
    const tempProductsDb = new Datastore({ filename: productsTempDbPath });
    let batch = [];
    let synced = 0;

    await rm(productsTempDbPath, { force: true });
    await tempProductsDb.loadDatabaseAsync();

    for await (const product of cursor) {
      batch.push({
        _id: String(product._id),
        barcode: product.barcode,
        name: product.name,
        qtd: product.qtd,
        price: product.price,
        lastUpdated: product.lastUpdated,
      });

      if (batch.length === batchSize) {
        await tempProductsDb.insertAsync(batch);
        synced += batch.length;
        batch = [];
      }
    }

    if (batch.length) {
      await tempProductsDb.insertAsync(batch);
      synced += batch.length;
    }

    await rm(productsDbPath, { force: true });
    await rename(productsTempDbPath, productsDbPath);
    await localProductsDb.loadDatabaseAsync();

    res.status(200).json({ synced });
  } catch (error) {
    console.log(error);
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while syncing products to local db"));
  }
}

export default { productExists, getProduct, createProduct, editProduct, syncProductsToLocalDb }
