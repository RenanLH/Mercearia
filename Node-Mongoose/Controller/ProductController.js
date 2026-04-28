import Product from "../Model/Product.js";

async function productExists(req, res) {
  try {
    const barcode = req.query.codBarras;

    const productDb = await Product.findOne({ barcode });

    res.status(200).json(productDb);

  } catch (error) {
    console.log(error);
    res.status(405).json({ message: "Error " + error });
  }
};


async function createProduct(req, res) {
  try {
    const product = req.body;
    const dateNow = new Date();

    await Product.create({
      name: product.name,
      qtd: product.qtd,
      price: product.price,
      lastUpdated: dateNow
    });

    res.status(200).json("Success");

  } catch (error) {
    console.log(error);
    res.status(405).json({ message: "Error " + error });
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
    res.status(405).json({ message: "Error " + error });
  }
};

async function getProduct(req, res) {
  try {
    const barcode = req.query.codBarras;

    console.log(barcode);

    const productDb = await Product.findOne({ barcode }).select('-_id');

    res.status(200).json(productDb);

  } catch (error) {
    console.log(error);
    res.status(405).json({ message: "Error " + error });
  }
};


export default { productExists, getProduct, createProduct, editProduct }