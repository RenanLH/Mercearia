import mongoose from "mongoose";
import Product from "./Product.js";

const Schema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
    },
    products: {
        type: [Product],
        required: false,
    },
})

export default mongoose.model('Purchase', Schema, 'Purchase');