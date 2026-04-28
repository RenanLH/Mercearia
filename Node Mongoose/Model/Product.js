import mongoose from "mongoose";

const Schema = new mongoose.Schema({
    barcode: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    qtd: {
        type: String, 
        required: true,        
    },
    price: {
        type: String,
        required: true,
    },
    lastUpdated: {
        type: Date,
        required: true,
    },
})

export default mongoose.model('Product', Schema, 'Product');