import mongoose from "mongoose";

const Schema = new mongoose.Schema({
    total: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    products: [{
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                req: false
            },
            name: {
                type: String,
                req: false
            },
            barcode: {
                type: String, 
                req: false
            },
            qtd: {
                type: String,
                req: true
            },
            price: {
                type: String,
                required: true
            },
        }],
})

export default mongoose.model('Sale', Schema, 'Sale');