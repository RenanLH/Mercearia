import { Router } from "express";
import ProductController from "../Controller/ProductController.js";
const routes = Router();


routes.get("/productExists", ProductController.productExists);
routes.get("/products", ProductController.getProduct);
routes.post("/products", ProductController.createProduct);
routes.put("/products", ProductController.editProduct);

/*routes.get("/sync");
routes.get("/updateDB");
routes.get("/changeTotal");
//routes.get("/scrape");
routes.post("/sales");
routes.get("/sales");

*/


export default routes;