import mongoose from "mongoose";
import Product from "./Product.js";

const Schema = new mongoose.Schema({
    total: {
        type: String,
        required: true,
        unique: true,
    },
    date: {
        type: String,
        required: true,
    },
    products: {
        type: [Product],
        required: false,
    },
})

export default mongoose.model('Sale', Schema, 'Sale');