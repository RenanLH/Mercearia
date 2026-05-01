import Product from "../Model/Product.js";
import RegisteredProduct from "../Model/RegisteredProduct.js";
import Sale from "../Model/Sale.js";
import RegisteredSale from "../Model/RegisteredSale.js";

async function createSale(req, res) {
  try {
    const sale = req.body;
    const productSale = [];
    const dateNow = new Date();

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
    res.status(500).json("Error");
  }
}

async function createRegisteredSale(req, res) {
  try {
    const nfcePayload = req.body;

    // Check if this sale was already registered
    const existingSale = await RegisteredSale.findOne({
      originalSaleId: nfcePayload.originalSaleId,
    }).lean();

    if (existingSale) {
      return res.status(409).json({
        status: "error",
        message: `This sale (ID: ${nfcePayload.originalSaleId}) has already been registered as sale #${existingSale.saleId}`,
        saleId: existingSale.saleId,
        registeredSaleId: existingSale._id,
      });
    }

    // Get the highest saleId and increment it
    const lastSale = await RegisteredSale.findOne()
      .sort({ saleId: -1 })
      .select("saleId")
      .lean();

    const nextSaleId = lastSale ? lastSale.saleId + 1 : 1;

    // Create new RegisteredSale with all NFCe data
    const registeredSale = await RegisteredSale.create({
      saleId: nextSaleId,
      originalSaleId: nfcePayload.originalSaleId,
      total: nfcePayload.total,
      date: nfcePayload.date,
      payment_method: nfcePayload.payment_method || "01",
      products: nfcePayload.products,
    });

    // Return both saleId and _id for rollback support
    res.status(200).json({
      status: "success",
      saleId: registeredSale.saleId,
      registeredSaleId: registeredSale._id,
    });
  } catch (error) {
    console.log(error);
    // Handle unique constraint errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        status: "error",
        message: `Duplicate entry: ${field} already exists`,
      });
    }
    res.status(500).json({ status: "error", message: error.message });
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

    let sales = await Sale.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      sales,
      numberSales,
      dailyTotal,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("Error");
  }
}

async function getRegisteredSales(req, res) {
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

    const [numberSales, totalValue, registeredTotalValue, response] =
      await Promise.all([
        Sale.countDocuments(query),
        Sale.aggregate([
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
        ]),
        RegisteredSale.aggregate([
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
              registeredDailyTotal: { $sum: "$totalAsNumber" },
            },
          },
        ]),
        Sale.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      ]);

    const dailyTotal = totalValue.length ? totalValue[0].dailyTotal : 0;
    const registeredDailyTotal = registeredTotalValue.length
      ? registeredTotalValue[0].registeredDailyTotal
      : 0;

    let formated = await formatSalesForFrontend(response);

    res.status(200).json({
      sales: formated,
      numberSales,
      dailyTotal,
      registeredDailyTotal,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("");
  }
}

async function formatSalesForFrontend(rawSalesFromDb) {
  const formattedSales = [];

  try {
    const normalizedSales = rawSalesFromDb.map((sale) => ({
      sale,
      products: sale.products.map((product) =>
        typeof product === "string" ? JSON.parse(product) : product,
      ),
    }));

    const barcodes = new Set();
    const saleIds = normalizedSales.map(({ sale }) => String(sale._id));

    for (const { products } of normalizedSales) {
      for (const product of products) {
        if (product?.barcode) {
          barcodes.add(product.barcode);
        }
      }
    }

    const [registeredSales, inventoryItems] = await Promise.all([
      RegisteredSale.find({
        originalSaleId: { $in: saleIds },
      })
        .select("originalSaleId saleId total")
        .lean(),
      RegisteredProduct.find({
        $or: [
          { barcode: { $in: Array.from(barcodes) } },
          { barcodeTrib: { $in: Array.from(barcodes) } },
        ],
      })
        .select("barcode barcodeTrib stock fiscal unit")
        .lean(),
    ]);

    const registeredSalesByOriginalId = new Map();
    for (const sale of registeredSales) {
      if (!registeredSalesByOriginalId.has(sale.originalSaleId)) {
        registeredSalesByOriginalId.set(sale.originalSaleId, sale);
      }
    }

    const inventoryByBarcode = new Map();
    for (const item of inventoryItems) {
      if (item.barcode && !inventoryByBarcode.has(item.barcode)) {
        inventoryByBarcode.set(item.barcode, item);
      }
      if (item.barcodeTrib && !inventoryByBarcode.has(item.barcodeTrib)) {
        inventoryByBarcode.set(item.barcodeTrib, item);
      }
    }

    const alternativesCache = new Map();
    async function getSuggestedAlternatives(numericPrice) {
      const cacheKey = numericPrice.toFixed(2);
      if (!alternativesCache.has(cacheKey)) {
        const minPrice = numericPrice * 0.85;
        const maxPrice = numericPrice * 1.15;

        const queryPromise = RegisteredProduct.aggregate([
          {
            $addFields: {
              priceNumber: {
                $toDouble: "$salePrice",
              },
            },
          },
          {
            $match: {
              priceNumber: {
                $gte: minPrice,
                $lte: maxPrice,
              },
              stock: {
                $gt: 0,
              },
            },
          },
          {
            $sort: {
              priceNumber: -1,
            },
          },
          {
            $limit: 5,
          },
          {
            $project: {
              _id: 1,
              name: 1,
              barcode: 1,
              barcodeTrib: 1,
              price: "$salePrice",
              stock: 1,
            },
          },
        ]);

        alternativesCache.set(cacheKey, queryPromise);
      }

      return alternativesCache.get(cacheKey);
    }

    for (const { sale, products } of normalizedSales) {
      const hydratedProducts = await Promise.all(
        products.map(async (productObj) => {
          const safePriceString = String(productObj.price).replace(",", ".");
          const numericPrice = parseFloat(safePriceString);
          const numericQtd = parseInt(productObj.qtd, 10);
          const dbInventoryItem = inventoryByBarcode.get(productObj.barcode);

          let isRegistered = false;
          let stockStatus = "red";
          let stock = 0;
          let alternatives = [];

          if (dbInventoryItem) {
            isRegistered = true;
            stock = dbInventoryItem.stock || 0;
            stockStatus = stock > 10 ? "green" : "yellow";
          } else {
            const suggestedAlts = await getSuggestedAlternatives(numericPrice);
            alternatives = suggestedAlts.map((alt) => ({
              id: String(alt._id),
              name: alt.name,
              price: alt.price.toString(),
              stock: alt.stock,
            }));
          }

          return {
            id: productObj.id || "unregistered",
            barcode: productObj.barcode,
            name: productObj.name,
            price: numericPrice,
            quantity: numericQtd,
            isRegistered,
            stockStatus,
            stock,
            alternatives,
            isOriginalItem: stockStatus === "red",
            fiscal: dbInventoryItem
              ? {
                  ncm: dbInventoryItem.fiscal?.ncm,
                  cfop: dbInventoryItem.fiscal?.cfopSale,
                  unit: dbInventoryItem.unit,
                  cest: dbInventoryItem.fiscal?.cest,
                  csosn: dbInventoryItem.fiscal?.csosn,
                  origin: dbInventoryItem.fiscal?.origin,
                }
              : null,
          };
        }),
      );

      const registeredSale = registeredSalesByOriginalId.get(String(sale._id));

      const formattedSale = {
        id: String(sale._id),
        date: sale.date,
        total: parseFloat(String(sale.total).replace(",", ".")),
        products: hydratedProducts,
        isRegistered: !!registeredSale,
        registeredSaleId: registeredSale?._id
          ? String(registeredSale._id)
          : undefined,
        registeredSaleInfo: registeredSale
          ? {
              saleId: registeredSale.saleId,
              total: registeredSale.total,
            }
          : undefined,
      };

      formattedSales.push(formattedSale);
    }
  } catch (error) {
    console.log(error);
  }

  return formattedSales;
}

async function removeRegisteredSale(req, res) {
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ status: "error", message: "Sale ID is required" });
    }

    const result = await RegisteredSale.findByIdAndDelete(id);

    if (!result) {
      return res
        .status(404)
        .json({ status: "error", message: "Sale not found" });
    }

    res.status(200).json({
      status: "success",
      message: "Registered sale removed successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: error.message });
  }
}

export default {
  createSale,
  getRegisteredSales,
  getSales,
  createRegisteredSale,
  removeRegisteredSale,
};
