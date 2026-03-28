import * as db from "./db.js"

export function compareProducts(localProduct, onlineProduct){
    if (localProduct == undefined || localProduct == null) return onlineProduct;
    
    if (onlineProduct == undefined || onlineProduct == null) return localProduct;

    if (localProduct.lastUpdated == ""  && onlineProduct.lastUpdated != null){
        return onlineProduct;
    }

    if (onlineProduct.lastUpdated == null){
        return localProduct;
    }

    const onlineDate = new Date(onlineProduct.lastUpdated);
    const localDate = new Date(localProduct.lastUpdated);

    if (onlineDate > localDate){

        const diff = Math.abs(onlineDate - localDate);
        const minutes = Math.floor((diff/1000)/60);

        if (minutes > 5){
            db.updateProduct(onlineProduct);
        }

        return onlineProduct;
    }

    return localProduct;

}