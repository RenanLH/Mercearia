import mongoose from "mongoose";

const Schema = new mongoose.Schema({
    saleId: {
        type: Number,
        unique: true,
        required: true,
        index: true
    },
    originalSaleId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    total: {
        type: String,
        required: true,
    },
    nfcecode: {
        type: String,
        default: null,
    },
    date: {
        type: Date,
        required: true,
    },
    payment_method: {
        type: String,
        required: true,
        default: '01'
    },
    products: [{
        product_id: {
            type: String,
            required: false
        },
        name: {
            type: String,
            required: true
        },
        barcode: {
            type: String,
            required: false,
            default: 'SEM GTIN'
        },
        qtd: {
            type: String,
            required: true
        },
        price: {
            type: String,
            required: true
        },
        ncm: {
            type: String,
            required: false
        },
        cfop: {
            type: String,
            required: false
        },
        unit: {
            type: String,
            required: false
        }
    }],
}, {
    timestamps: true
})

export default mongoose.model('RegisteredSale', Schema, 'RegisteredSale');
