import mongoose from "mongoose";

const Schema = new mongoose.Schema({
    barcode: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: false,
    },
    salesName: {
        type: String,
        required: false,
    },

    qtd: {
        type: String, 
        required: false,        
    },
    price: {
        type: String,
        required: false,
    },
    lastUpdated: {
        type: Date,
        required: false,
    },
})

export default mongoose.model('Product', Schema, 'Product');