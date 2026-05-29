import RegisteredProduct from "../Model/RegisteredProduct.js";
import Product from "../Model/Product.js";
import Purchase from "../Model/Purchase.js";
import RegisteredSale from "../Model/RegisteredSale.js";
import {
  hasValidBarcode,
  getEffectiveStock,
  toDecimal128,
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

function parseStockNumber(value) {
  return Number(String(value ?? 0).replace(",", ".")) || 0;
}

function hasUsableBarcode(value) {
  return hasValidBarcode(value) && value !== "SEM GTIM";
}

function getProductMovementKey(product) {
  const barcode = hasUsableBarcode(product.barcode) ? product.barcode : null;
  const ncm = product.fiscal?.ncm;

  if (barcode) {
    return `barcode:${barcode}`;
  }

  return `name-ncm:${product.name}:${ncm}`;
}

function getPurchaseProductKey(product) {
  const barcode = hasUsableBarcode(product.cEAN) ? product.cEAN : null;

  if (barcode) {
    return `barcode:${barcode}`;
  }

  return `name-ncm:${product.xProd}:${product.NCM}`;
}

function getRegisteredSaleProductKey(product) {
  const barcode = hasUsableBarcode(product.barcode) ? product.barcode : null;

  if (barcode) {
    return `barcode:${barcode}`;
  }

  return `name-ncm:${product.name}:${product.ncm}`;
}

function addMovementTotal(totals, key, quantity) {
  if (totals.has(key)) {
    totals.set(key, totals.get(key) + quantity);
  }
}

function getStockAndConversionFactor(product, unitTrib) {
  const unit = String(product.unit || "").toLowerCase();
  const tribUnit = String(unitTrib || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();

  if (unit === "cx" && tribUnit === "kg" && !name.includes("kg")) {
    const grams = name.match(/\b(\d+(?:[.,]\d+)?)\s*g\b/i);

    if (grams) {
      const conversionFactor = Number(grams[1].replace(",", ".")) / 1000;

      if (conversionFactor > 0) {
        return {
          stock: parseStockNumber(product.stockTrib) / conversionFactor,
          conversionFactor,
        };
      }
    }
  }

  return {
    stock: getEffectiveStock(
      product.stock,
      product.stockTrib,
      product.unit,
      unitTrib,
      product.costPrice,
      product.costPriceTrib,
      product.name,
    ),
    conversionFactor: 1,
  };
}

async function createRegisteredProduct(productsInput, session) {
  const products = Array.isArray(productsInput)
    ? productsInput
    : [productsInput];
  const productMap = new Map();

  const barcodes = [];
  const barcodesTrib = [];

  for (const product of products) {
    const barcode = product.barcode || "SEM GTIN";
    const barcodeTrib = product.barcodeTrib || barcode;

    if (hasValidBarcode(barcode)) {
      barcodes.push(barcode);
    }
    if (hasValidBarcode(barcodeTrib) && barcodeTrib !== barcode) {
      barcodesTrib.push(barcodeTrib);
    }
  }

  const existingByBarcode = new Map();
  const newProducts = [];
  if (barcodes.length > 0 || barcodesTrib.length > 0) {
    const existingProducts = await RegisteredProduct.find({
      $or: [
        ...(barcodes.length > 0
          ? [{ barcode: { $in: barcodes } }, { barcodeTrib: { $in: barcodes } }]
          : []),
        ...(barcodesTrib.length > 0
          ? [
              { barcode: { $in: barcodesTrib } },
              { barcodeTrib: { $in: barcodesTrib } },
            ]
          : []),
      ],
    })
      .session(session)
      .lean();

    existingProducts.forEach((p) => {
      existingByBarcode.set(p.barcode, p);
      existingByBarcode.set(p.barcodeTrib, p);
    });
  }

  for (const product of products) {
    const barcode = product.barcode || "SEM GTIN";
    const barcodeTrib = product.barcodeTrib || barcode;
    const mapKey = hasValidBarcode(barcode)
      ? barcode
      : product.code + product.name;

    let existing = null;
    if (hasValidBarcode(barcode)) {
      existing = existingByBarcode.get(barcode);
    } else if (hasValidBarcode(barcodeTrib)) {
      existing = existingByBarcode.get(barcodeTrib);
    }

    if (!existing) {
      existing = await RegisteredProduct.findOne({
        name: product.name,
        unit: product.unit,
        "fiscal.ncm": product.fiscal?.ncm,
      })
        .session(session)
        .lean();
    }

    if (existing) {
      existing.code = product.code;
      existing.barcode = barcode;
      existing.barcodeTrib = barcodeTrib;
      existing.name = product.name;
      existing.unit = product.unit;
      existing.unitTrib = product.unitTrib || product.unit;

      const stockData = getStockAndConversionFactor(product, existing.unitTrib);
      existing.stock = Number(existing.stock || 0) + stockData.stock;
      existing.conversionFactor = toDecimal128(stockData.conversionFactor);

      existing.costPrice = toDecimal128(product.costPrice);
      existing.costPriceTrib = toDecimal128(product.costPriceTrib);
      existing.fiscal = buildFiscalDefaults(product.fiscal);
      existing.taxFuture = buildTaxFutureDefaults(product.taxFuture);

      await RegisteredProduct.updateOne(
        { _id: existing._id },
        { $set: existing },
        { session },
      );

      productMap.set(mapKey, existing);
    } else {
      newProducts.push({
        inputProduct: product,
        barcode,
        barcodeTrib,
      });
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
      .map((p) => [p.barcode, p.barcodeTrib])
      .flat()
      .filter(hasValidBarcode);

    const oldProductsMap = new Map();
    if (oldBarcodes.length > 0) {
      const oldProds = await Product.find({
        $or: [{ barcode: { $in: oldBarcodes } }],
      }).lean();
      oldProds.forEach((p) => oldProductsMap.set(p.barcode, p));
    }

    const createPayload = newProducts.map(
      ({ inputProduct, barcode, barcodeTrib }) => {
        const oldProduct =
          oldProductsMap.get(barcode) || oldProductsMap.get(barcodeTrib);
        const unitTrib = inputProduct.unitTrib || inputProduct.unit;
        const stockData = getStockAndConversionFactor(inputProduct, unitTrib);
        return {
          sku: ++nextSku,
          barcode,
          barcodeTrib,
          name: inputProduct.name,
          unit: inputProduct.unit,
          unitTrib,
          stock: stockData.stock,
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

    const createdProducts = await RegisteredProduct.create(createPayload, {
      session,
      ordered: true,
    });

    createdProducts.forEach((created, idx) => {
      const { barcode, inputProduct } = newProducts[idx];
      const mapKey = hasValidBarcode(barcode)
        ? barcode
        : inputProduct.code + inputProduct.name;
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

    const sortByMap = {
      stock: "stock",
      name: "name",
      salePrice: "salePrice",
      createdAt: "createdAt",
    };
    const sortBy = sortByMap[sortByRaw] || "createdAt";

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

    const sort = { [sortBy]: sortOrder, createdAt: -1, _id: -1 };

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
      .select("_id name barcode fiscal.ncm")
      .lean();

    const totals = {};
    const boughtTotals = new Map();
    const soldTotals = new Map();
    const purchaseConditions = [];
    const saleConditions = [];

    for (const product of products) {
      const key = getProductMovementKey(product);
      boughtTotals.set(key, 0);
      soldTotals.set(key, 0);
      totals[product._id] = { bought: 0, sold: 0, key };

      if (hasUsableBarcode(product.barcode)) {
        purchaseConditions.push({ "products.cEAN": product.barcode });
        saleConditions.push({ "products.barcode": product.barcode });
      } else {
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
        addMovementTotal(
          boughtTotals,
          getPurchaseProductKey(product),
          Number(product.stockCom ?? product.qCom) || 0,
        );
      }
    }

    for (const registeredSale of registeredSales) {
      for (const product of registeredSale.products || []) {
        addMovementTotal(
          soldTotals,
          getRegisteredSaleProductKey(product),
          parseStockNumber(product.qtd),
        );
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
