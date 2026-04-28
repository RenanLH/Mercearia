import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    index: true
  }, // cProd

  barcode: {
    type: String,
    default: "SEM GTIN",
    index: true
  }, // cEAN

  barcodeTrib: {
    type: String,
    default: "SEM GTIN",
    index: true
  }, // cEANTrib

  name: {
    type: String,
    required: true
  }, // xProd

  unit: {
    type: String,
    required: true
  }, // uCom

  unitTrib: {
    type: String,
    required: true
  }, // uTrib

  stock: {
    type: Number,
    default: 0
  },

  costPrice: {
    type: mongoose.Schema.Types.Decimal128,
    default: () => mongoose.Types.Decimal128.fromString("0.00")
  },

  costPriceTrib: {
    type: mongoose.Schema.Types.Decimal128,
    default: () => mongoose.Types.Decimal128.fromString("0.00")
  },

  salePrice: {
    type: mongoose.Schema.Types.Decimal128,
    default: () => mongoose.Types.Decimal128.fromString("0.00")
  }, // usado para compor vUnCom / vUnTrib

  fiscal: {
    ncm: {
      type: String,
      required: true
    }, // NCM

    cest: {
      type: String,
      default: null
    }, // CEST

    cfopSale: {
      type: String,
      required: true,
      default: "5102"
    }, // CFOP

    origin: {
      type: String,
      required: true,
      default: "0"
    }, // orig

    csosn: {
      type: String,
      required: true,
      default: "102"
    }, // CSOSN

    cBenef: {
      type: String,
      default: null
    }, // cBenef

    cstPis: {
      type: String,
      default: null
    }, // CST (grupo PIS)

    cstCofins: {
      type: String,
      default: null
    }, // CST (grupo COFINS)

    indTot: {
      type: String,
      default: "1"
    } // indTot
  },

  taxFuture: {
    ibsCbsCst: {
      type: String,
      default: null
    }, // CST (grupo IBSCBS)

    cClassTrib: {
      type: String,
      default: null
    } // cClassTrib
  }
}, {
  timestamps: true
});

Schema.index({ code: 1, name: 1 });
Schema.index({ code: 1, name: 1, unit: 1, 'fiscal.ncm': 1 });

export default mongoose.model('RegisteredProduct', Schema, 'RegisteredProduct');