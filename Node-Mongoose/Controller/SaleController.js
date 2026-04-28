import Product from '../Model/Product.js';
import RegisteredProduct from '../Model/RegisteredProduct.js';
import Sale from '../Model/Sale.js'

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
          price: product.price
        });
      } else {
        productSale.push({
          name: product.name,
          qtd: product.qtd,
          price: product.price

        });
      }
    }

    await Sale.create({
      total: sale.total,
      date: dateNow,
      products: productSale
    })

    res.status(200).json("Success")

  } catch (error) {
    console.log(error);
    res.status(500).json("Error")
  }

}

async function createRegisteredSale(req, res) {
  try {
    const sale = req.body;
    res.status(200).json("Success")

  } catch (error) {
    console.log(error);
    res.status(500).json("Error")
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
        $gte: dayBefore
      }
    };
    
    const numberSales = await Sale.countDocuments(query);

    const totalValue = await Sale.aggregate([
      {
        $match: {
          date: {
            $lt: dateRequested,
            $gte: dayBefore
          }
        }
      },
      {
        $project: {
          totalAsNumber: {
            $toDouble: {
              $replaceAll: {
                input: "$total",
                find: ",",
                replacement: "."
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          dailyTotal: { $sum: "$totalAsNumber" }
        }
      }
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
      dailyTotal
    });

  } catch (error) {
    console.log(error);
    res.status(500).json("Error")
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
        $gte: dayBefore
      }
    };

    const numberSales = await Sale.countDocuments(query);

    const totalValue = await Sale.aggregate([
      {
        $match: {
          date: {
            $lt: dateRequested,
            $gte: dayBefore
          }
        }
      },
      {
        $project: {
          totalAsNumber: {
            $toDouble: {
              $replaceAll: {
                input: "$total",
                find: ",",
                replacement: "."
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          dailyTotal: { $sum: "$totalAsNumber" }
        }
      }
    ]);

    const dailyTotal = totalValue.length ? totalValue[0].dailyTotal : 0;

    let response = await Sale.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    let formated = await formatSalesForFrontend(response);

    res.status(200).json({
      sales: formated,
      numberSales,
      dailyTotal
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("");
  }
};

async function formatSalesForFrontend(rawSalesFromDb) {
  const formattedSales = [];

  try {
    for (const sale of rawSalesFromDb) {
      const hydratedProducts = [];

      for (const product of sale.products) {
        const productObj = JSON.parse(product);
        const safePriceString = String(productObj.price).replace(',', '.');
        const numericPrice = parseFloat(safePriceString);
        const numericQtd = parseInt(productObj.qtd, 10);

        let dbInventoryItem = await RegisteredProduct.findOne({
          $or: [
            { barcode: productObj.barcode },
            { barcodeTrib: productObj.barcode }
          ]
        }).lean();

        let isRegistered = false;
        let stockStatus = 'red';
        let stock = 0;
        let alternatives = [];

        if (dbInventoryItem) {
          isRegistered = true;
          stock = dbInventoryItem.stock || 0;
          stockStatus = stock > 10 ? 'green' : 'yellow';
        } 
        else {
          isRegistered = false;
          stockStatus = 'red';

          const minPrice = numericPrice * 0.85;
          const maxPrice = numericPrice * 1.15;

          const suggestedAlts = await RegisteredProduct.aggregate([
            {
              $addFields: {
                priceNumber: {
                  $toDouble: "$salePrice"
                }
              }
            },
            {
              $match: {
                priceNumber: {
                  $gte: minPrice,
                  $lte: maxPrice
                },
                stock: {
                  $gt: 0
                }
              }
            },
            {
              $sort: {
                priceNumber: -1
              }
            },
            {
              $limit: 5
            },
            {
              $project: {
                _id: 1,
                name: 1,
                barcode: 1,
                barcodeTrib: 1,
                price: "$salePrice",
                stock: 1
              }
            }
          ]);

          alternatives = suggestedAlts.map(alt => ({
            id: String(alt._id),
            name: alt.name,
            price: alt.price.toString(),
            stock: alt.stock
          }));


        }

        hydratedProducts.push({
          id: productObj.id || "unregistered",
          barcode: productObj.barcode,
          name: productObj.name,
          price: numericPrice,
          quantity: numericQtd,
          isRegistered,
          stockStatus,
          stock,
          alternatives,
          isOriginalItem: stockStatus === 'red'
        });


      }

      formattedSales.push({
        id: String(sale._id),
        date: sale.date,
        total: parseFloat(String(sale.total).replace(',', '.')),
        products: hydratedProducts
      });
    }
  } catch (error) {
    console.log(error);
  }

  return formattedSales;
}



export default { createSale, getRegisteredSales, getSales, createRegisteredSale }