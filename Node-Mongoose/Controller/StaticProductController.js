import StaticProduct from "../Model/StaticProduct";

const createStaticProduct = async (req, res) => {
  try {
    const product = req.body;
    const dateNow = new Date();

    await StaticProduct.create({
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

const getStaticProducts = async (req, res) => {
  try {
    const staticProducts = await StaticProduct.find().lean();
    res.status(200).json(staticProducts);
  } catch (error) {
    console.log(error);
    res.status(500).json("Error: " + (error.errorResponse?.errmsg || error.message || "An error occurred while fetching static products"));
  }
};

export default { getStaticProducts, createStaticProduct };
