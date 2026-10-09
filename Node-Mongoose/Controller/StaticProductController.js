import StaticProduct from "../Model/StaticProduct.js";
import { isMongoOnline } from "../Util/Utilities.js"

const createStaticProduct = async (req, res) => {
  try {
    const product = req.body;
    const dateNow = new Date();

    const existingProduct = await StaticProduct.findOne({ name: product.name }).lean();
    if (existingProduct) {
      console.log('error');

      return res.status(400).json("Error: Product with this name already exists");
    }

    const lastProduct = await StaticProduct.findOne({
      sku: { $exists: true, $ne: null },
    })
      .sort({ sku: -1 })
      .select("sku")
      .lean();


    let sku = lastProduct?.sku || 0;
    ++sku;
    
    await StaticProduct.create({
      sku,
      name: product.name,
      price: product.price,
      lastUpdated: dateNow,
    });

    res.status(200).json("Success");
  } catch (error) {
    console.log(error);
    res.status(405).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while creating a static product"));
  }
};

const getStaticProduct = async (req, res) => {
  try {
    const { productName } = req.query;

    if (!await isMongoOnline()) {
      return res.status(503).json("Error: MongoDB is not online");
    }

    const staticProduct = await StaticProduct.findOne({ name: productName }).lean();
    if (!staticProduct) {
      return res.status(404).json("Error: Product not found");
    }

    res.status(200).json(staticProduct);
  } catch (error) {
    console.log(error);
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while fetching the static product"));
  }
};

const getStaticProducts = async (req, res) => {
  try {
    if (!await isMongoOnline()) {
      console.log("getStaticProducts MongoDB is offline");

      return res.status(503).json("Error: MongoDB is not online");
    }

    const staticProducts = await StaticProduct.find().sort({ sku: 1 }).lean();

    if (!staticProducts) {
      return res.status(404).json("Error: Products not found");
    }

    res.status(200).json(staticProducts);
  } catch (error) {
    console.log(error);
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while fetching the static product"));
  }
};

async function editStaticProduct(req, res) {
  try {
    const product = req.body;
    const dateNow = new Date();

    await StaticProduct.findOneAndUpdate({
      sku: product.sku
    },
      {
        name: product.name,
        price: product.price,
        lastUpdated: dateNow
      });

    res.status(200).json("Success");

  } catch (error) {
    console.log(error);
    res.status(405).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while editing the product"));
  }
};

export default { getStaticProduct, createStaticProduct, editStaticProduct, getStaticProducts };
