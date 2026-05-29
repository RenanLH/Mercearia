import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    idNfe: {
      type: String,
      required: true,
      unique: true,
    },

    xNome: {
      type: String,
      required: true,
    },

    dhEmi: {
      type: String,
      required: true,
    },

    products: {
      type: [
        {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RegisteredProduct",
            required: false,
          },

          cProd: {
            type: String,
            required: false,
          },

          xProd: {
            type: String,
            required: true,
          },

          cEAN: {
            type: String,
            required: false,
          },

          cEANTrib: {
            type: String,
            required: false,
          },

          NCM: {
            type: String,
            required: true,
          },

          CEST: {
            type: String,
            required: false,
          },

          CFOP: {
            type: String,
            required: false,
          },

          uCom: {
            type: String,
            required: false,
          },

          qCom: {
            type: Number,
            required: false,
          },

          vUnCom: {
            type: mongoose.Schema.Types.Decimal128,
            required: false,
          },

          vProd: {
            type: mongoose.Schema.Types.Decimal128,
            required: false,
          },

          uTrib: {
            type: String,
            required: false,
          },

          qTrib: {
            type: Number,
            required: true,
          },

          vUnTrib: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
          },

          stockCom: {
            type: Number,
            required: false,
          },

          stockTrib: {
            type: Number,
            required: false,
          },

          costPriceCom: {
            type: mongoose.Schema.Types.Decimal128,
            required: false,
          },

          costPriceTrib: {
            type: mongoose.Schema.Types.Decimal128,
            required: false,
          },
        },
      ],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Purchase", Schema, "Purchase");
