import RegisteredProduct from "../Model/RegisteredProduct.js";
import Product from "../Model/Product.js";
import Purchase from "../Model/Purchase.js";
import RegisteredSale from "../Model/RegisteredSale.js";
import {
  safeSum,
  toDecimal128,
  getProductKey,
  hasValidBarcode,
} from "../Util/Utilities.js";
import {
  buildFiscalDefaults,
  buildTaxFutureDefaults,
} from "../Util/Utilities.js";

function parseDecimalValue(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value) || 0;
  }

  if (typeof value?.$numberDecimal === "string") {
    return Number(value.$numberDecimal) || 0;
  }

  if (typeof value?.toString === "function") {
    return Number(value.toString()) || 0;
  }

  return 0;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDecimalNumber(value) {
  return Number(String(value ?? 0).replace(",", ".")) || 0;
}



function getStockToAdd(product) {
  const stockTrib = parseDecimalNumber(product.qTrib ?? product.stockTrib);
  const stock = parseDecimalNumber(product.qCom ?? product.stock);
  const unit = product.uCom ?? product.unit;
  const unitTrib = product.uTrib ?? product.unitTrib;

  if (unit.includes("CX") && !unitTrib.includes("CX")) {
    return stockTrib;
  }

  return stock;
}


function getStockAndConversionFactor(product, stockToAdd) {
  const safeUnit = String(product.unit).toLowerCase();
  const safeTribUnit = String(product.unitTrib).toLowerCase();
  const safeName = String(product.name).toLowerCase();
  const stockTrib = parseDecimalNumber(stockToAdd);
  if (safeUnit === "kg" && safeTribUnit !== "kg") {
    const grams = safeName.match(/\b(\d+(?:[.,]\d+)?)\s*g\b/i);

    if (grams) {
      const conversionFactor = Number(grams[1].replace(",", "."));

      if (conversionFactor > 1) {
        const safeStockTrib = stockTrib * 1000; // Convert to grams
        return {
          stock: safeStockTrib / conversionFactor,
          conversionFactor,
        };
      }
    }
    if ((product.barcode === "17896275920835" && product.barcodeTrib === "7896275920838") || product.barcode === "7896275920838")  { // MORTADELA TIPO BOLOGNA FAT
      const conversionFactor = 200; // 200g per unit
      const safeStockTrib = stockTrib * 1000; // Convert to grams
      return {
        stock: safeStockTrib / conversionFactor,
        conversionFactor,
      };
    }

    if ((product.barcode === "17896275900035" && product.barcodeTrib === "7896275900038") || product.barcode === "7896275900038") { // HAMBURGUER BOVINO GRANEL 2,016kg
      const conversionFactor = 56; // 56g per unit
      const safeStockTrib = stockTrib * 1000; // Convert to grams
      return {
        stock: safeStockTrib / conversionFactor,
        conversionFactor,
      };
    }

    if ((product.barcode === "17896275900578" && product.barcodeTrib === "7896275900571") || product.barcode === "7896275900571") { // HAMBURGUER CARNE BOVINA 6,048kg
      const conversionFactor = 56; // 56g per unit
      const safeStockTrib = stockTrib * 1000; // Convert to grams
      return {
        stock: safeStockTrib / conversionFactor,
        conversionFactor,
      };
    }

    return {
      stock: stockTrib,
      conversionFactor: 1000, // Default conversion factor for kg to g
    };
  }

  return {
    stock: stockTrib,
    conversionFactor: 1,
  };
}

async function createRegisteredProduct(productList, session) {
  const products = Array.isArray(productList)
    ? productList
    : [productList];
  const productMap = new Map();

  const barcodes = [];

  for (const product of products) {
    const barcode = product.barcode || "SEM GTIN";
    if (hasValidBarcode(barcode)) {
      barcodes.push(barcode);
    }
  }

  const existingByBarcode = new Map();
  const newProducts = [];
  if (barcodes.length > 0) {
    const existingProducts = await RegisteredProduct.find({
      barcode: { $in: barcodes } // , { barcodeTrib: { $in: barcodes } } not needed because we are only checking for the main barcode here
    })
    .session(session)
    .lean();


    existingProducts.forEach((p) => {
      existingByBarcode.set(p.barcode, p);
    });

  }

  for (const product of products) {
    const barcode = product.barcode || "SEM GTIN";
    const mapKey = getProductKey(product);
    let existing = null;
    if (hasValidBarcode(barcode)) {
      existing = existingByBarcode.get(barcode);
    }else {
      existing = await RegisteredProduct.findOne({
        name: product.name,
        unit: product.unit,
        "fiscal.ncm": product.fiscal?.ncm,
      })
      .session(session)
        .lean();
    }

    if (existing) {

      const stockData = getStockAndConversionFactor(existing, product.stock);
      const updatedStock = safeSum(Number(existing.stock), Number(stockData.stock));

      existing.stock = toDecimal128(updatedStock);
      existing.costPrice = toDecimal128(product.costPrice);
      existing.costPriceTrib = toDecimal128(product.costPriceTrib);
      existing.fiscal = buildFiscalDefaults(product.fiscal);
      existing.taxFuture = buildTaxFutureDefaults(product.taxFuture);

      await RegisteredProduct.updateOne(
        { _id: existing._id },
        { $set: existing },
        { session },
      );

      if (existing.unit === "CX"
          && hasValidBarcode(product.barcode)
          && hasValidBarcode(product.barcodeTrib)
          && product.barcode != product.barcodeTrib) {

          const singleExistingProduct = await RegisteredProduct.findOne({
            barcode: product.barcodeTrib,
            unit: product.unitTrib,
          })
            .session(session)
            .lean();


          if (singleExistingProduct) {
            const singleStockData = getStockAndConversionFactor(singleExistingProduct, product.stockTrib);
            const singleUpdatedStock = safeSum(Number(singleExistingProduct.stock), Number(singleStockData.stock));

            singleExistingProduct.stock = toDecimal128(singleUpdatedStock);


            await RegisteredProduct.updateOne(
              { _id: singleExistingProduct._id },
              { $set: singleExistingProduct },
              { session },
            );

            const singleMapKey = hasValidBarcode(singleExistingProduct.barcode)
              ? singleExistingProduct.barcode
              : singleExistingProduct.code + singleExistingProduct.name;

            productMap.set(singleMapKey, existing);
          }

        }

      productMap.set(mapKey, existing);
    } else {
      newProducts.push({
        inputProduct: product,
        barcode,
        single: false,
      });

      if (product.unit === "CX"
        && hasValidBarcode(product.barcode)
        && hasValidBarcode(product.barcodeTrib)
        && product.barcode != product.barcodeTrib) {

        let singleTribProduct = await RegisteredProduct.findOne({
          barcode: product.barcodeTrib,
          unit: product.unitTrib,
        })
          .session(session)
          .lean();

        if (singleTribProduct) {
          const stockData = getStockAndConversionFactor(singleTribProduct, product.stockTrib);
          singleTribProduct.stock = safeSum(Number(singleTribProduct.stock), Number(stockData.stock));

          await RegisteredProduct.updateOne(
            { _id: singleTribProduct._id },
            { $set: singleTribProduct },
            { session },
          );

          productMap.set(singleTribProduct.barcode, singleTribProduct);
        }
        else {

          singleTribProduct = { ...product };
          singleTribProduct.unit = product.unitTrib;
          singleTribProduct.unitTrib = "UN";

          newProducts.push({
            inputProduct: singleTribProduct,
            barcode: product.barcodeTrib,
            single: true,
          });
        }
      }
    }
  }

  if (newProducts.length > 0) {
    const lastRegisteredProduct = await RegisteredProduct.findOne({
      sku: { $exists: true, $ne: null },
    })
      .sort({ sku: -1 })
      .select("sku")
      .session(session)
      .lean();

    let nextSku = Number(lastRegisteredProduct?.sku || 0);

    const oldBarcodes = newProducts
      .map((p) => [p.barcode])
      .flat()
      .filter(hasValidBarcode);

    const oldBarcodesZero = newProducts
      .filter((p) => p.barcode && String(p.barcode).startsWith("00"))
      .map((p) => [String(p.barcode).slice(1)])
      .flat()
      .filter(hasValidBarcode);

    const oldProductsMap = new Map();
    if (oldBarcodes.length > 0 || oldBarcodesZero.length > 0) {
      const oldProds = await Product.find({
        $or: [
          { barcode: { $in: oldBarcodes } },
          { barcode: { $in: oldBarcodesZero } },
        ],
      }).lean();
      oldProds.forEach((p) => oldProductsMap.set(p.barcode, p));
    }



    const createPayload = newProducts.map(
      ({ inputProduct, barcode, single }) => {
        const oldProduct = String(barcode).startsWith("00")? oldProductsMap.get(String(barcode).slice(1)): oldProductsMap.get(barcode);
        const unitTrib = inputProduct.unitTrib || inputProduct.unit;
        const stockToAdd = getStockToAdd(inputProduct);
        const stockData = getStockAndConversionFactor(inputProduct, single? inputProduct.stockTrib : stockToAdd);
        return {
          sku: ++nextSku,
          barcode,
          barcodeTrib: inputProduct.barcodeTrib || "SEM GTIN",
          name: inputProduct.name,
          unit: inputProduct.unit,
          unitTrib,
          stock: toDecimal128(stockData.stock),
          conversionFactor: toDecimal128(stockData.conversionFactor),
          costPrice: toDecimal128(inputProduct.costPrice),
          costPriceTrib: toDecimal128(inputProduct.costPriceTrib),
          salePrice: toDecimal128(
            oldProduct?.price ?? inputProduct.salePrice ?? 0,
          ),
          fiscal: buildFiscalDefaults(inputProduct.fiscal),
          taxFuture: buildTaxFutureDefaults(inputProduct.taxFuture),
        };
      },
    );
    
    const createdProducts = await RegisteredProduct.insertMany(createPayload, { session, ordered: true });
    
    createdProducts.forEach((created, _idx) => {
      const mapKey = getProductKey(created);
      productMap.set(mapKey, created);
    });
  }

  return productMap;
}

async function getRegisteredProducts(req, res) {
  try {
    const search = String(req.query.search || "").trim();
    const sortByRaw = String(req.query.sortBy || "createdAt");
    const sortOrder = String(req.query.sortOrder || "desc") === "asc" ? 1 : -1;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const price = parseDecimalValue(req.query.price);
    const zeroStock = String(req.query.zeroStock || "true").toLowerCase() === "true"; //Brings products with zero stock, used to show all registered products, Default is true

    const sortByArray = sortByRaw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    const query = {};
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { barcode: { $regex: escapedSearch, $options: "i" } },
        { barcodeTrib: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (price > 0) {
      query.$expr = {
        $and: [
          { $gte: [{ $toDouble: "$salePrice" }, price * 0.95  ] },
          { $lte: [{ $toDouble: "$salePrice" }, price * 1.05] },
        ],
      };
    }

    if (!zeroStock) {
      query.stock = { $gt: 0 };
    }

    const sort = {};

    for (const sortBy of sortByArray) {
      sort[sortBy] = sortOrder;
    }

    const [totalProducts, products] = await Promise.all([
      RegisteredProduct.countDocuments(query),
      RegisteredProduct.find(query).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    const totalPages = Math.max(Math.ceil(totalProducts / limit), 1);

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      sku: product.sku,
      name: product.name,
      stock: Number(product.stock) || 0,
      conversionFactor: parseDecimalValue(product.conversionFactor) || 1,
      barcode: product.barcode,
      barcodeTrib: product.barcodeTrib,
      unit: product.unit,
      unitTrib: product.unitTrib,
      fiscal: product.fiscal,
      costPrice: parseDecimalValue(product.costPrice),
      costPriceTrib: parseDecimalValue(product.costPriceTrib),
      salePrice: parseDecimalValue(product.salePrice),
      createdAt: product.createdAt,
    }));

    res.status(200).json({
      products: formattedProducts,
      pagination: {
        totalItems: totalProducts,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json(
        "Error: " +
          (error.errorResponse?.errmsg ||
            error.message ||
            "An error occurred while fetching registered products"),
      );
  }
}

async function getRegisteredProductMovementTotals(req, res) {
  try {
    const productIds = Array.isArray(req.body.productIds)
      ? req.body.productIds
      : [];

    if (productIds.length === 0) {
      return res.status(200).json({ totals: {} });
    }

    const products = await RegisteredProduct.find({
      _id: { $in: productIds },
    })
      .select("_id name barcode barcodeTrib fiscal.ncm")
      .lean();

    const totals = {};
    const boughtTotals = new Map();
    const soldTotals = new Map();
    const purchaseConditions = [];
    const saleConditions = [];


    for (const product of products) {
      const key = getProductKey(product);
      boughtTotals.set(key, 0);
      soldTotals.set(key, 0);
      totals[product._id] = { bought: 0, sold: 0, key };

      if (hasValidBarcode(product.barcode)) {
        purchaseConditions.push({ "products.cEAN": product.barcode });
        saleConditions.push({ "products.barcode": product.barcode });
      }

      else {
        purchaseConditions.push({
          "products.xProd": product.name,
          "products.NCM": product.fiscal?.ncm,
        });
        saleConditions.push({
          "products.name": product.name,
          "products.ncm": product.fiscal?.ncm,
        });
      }
    }


    const [purchases, registeredSales] = await Promise.all([
      purchaseConditions.length > 0
        ? Purchase.find({ $or: purchaseConditions }).select("products").lean()
        : [],
      saleConditions.length > 0
        ? RegisteredSale.find({ $or: saleConditions }).select("products").lean()
        : [],
    ]);

    for (const purchase of purchases) {
      for (const product of purchase.products || []) {
        const key = getProductKey(product);
        const quantity = getStockToAdd(product);
        if (boughtTotals.has(key)) {
          boughtTotals.set(key, safeSum(boughtTotals.get(key), quantity));
        }
      }
    }

    for (const registeredSale of registeredSales) {
      for (const product of registeredSale.products || []) {
        const key = getProductKey(product);
        const quantity = Number(product.qtd) || 0;
        if (soldTotals.has(key)) {
          soldTotals.set(key, safeSum(soldTotals.get(key), quantity));
        }
      }
    }

    for (const total of Object.values(totals)) {
      total.bought = boughtTotals.get(total.key) || 0;
      total.sold = soldTotals.get(total.key) || 0;
      delete total.key;
    }

    res.status(200).json({ totals });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json(
        "Error: " +
          (error.errorResponse?.errmsg ||
            error.message ||
            "An error occurred while fetching registered product totals"),
      );
  }
}

export {
  createRegisteredProduct,
  getRegisteredProducts,
  getRegisteredProductMovementTotals,
};
