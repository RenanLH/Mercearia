import * as mysqlx from "@mysql/xdevapi"

const config = {schema: 'mydb', user: 'root', password: 'aethermd', table: 'product'}

export async function addProduct(product){
    try{
        const session = await mysqlx.getSession({ user: config.user, password: config.password })
       
        session.sql(`create database if not exists ${config.schema}`)
                .execute()
                .then(() => {
                    return session.sql(`create table if not exists ${config.schema}.${config.table} (
                        idProduct INT(11) NOT NULL AUTO_INCREMENT, barcode VARCHAR(20) NOT NULL, name VARCHAR(100) NOT NULL, 
                        salesName VARCHAR(100), qtd VARCHAR(10) NOT NULL, price VARCHAR(10) NOT NULL,
                        PRIMARY KEY(idProduct),UNIQUE INDEX barcode_UNIQUE (barcode ASC) VISIBLE)`)
                        .execute()
                })
                .then(()=>{
                    const table = session.getSchema(config.schema).getTable(config.table);

                    return table.insert('barcode', 'name', 
                        'salesName', 'qtd', 'price', 'lastUpdated')
                        .values(product.barcode, product.name, 
                            product.salesName, product.qtd, product.price, new Date())
                        .execute()
                })
                .then(() => {
                    return session.close();
                });
        
    }catch(error){
        console.log(error);
    }
}

export async function updateDB() {
    try {
        const session = await mysqlx.getSession({user: config.user, password: config.password});

        session.sql(`ALTER TABLE mydb.Product 
            ADD COLUMN lastUpdated VARCHAR(45) NOT NULL AFTER qtd;`).execute().then(()=>{return session.close()});

    } catch (error) {
        console.log(error);
    }
    
}

export async function updateProduct(product) {
    try {
        const session = await mysqlx.getSession({ user: config.user, password: config.password });
        const table = session.getSchema(config.schema).getTable(config.table);

        const result = table.update()
            .where('barcode = ' + product.barcode)
            .set('name', product.name)
            .set('salesName', product.salesName)
            .set('price', product.price)
            .set('qtd', product.qtd)
            .set('lastUpdated', new Date())
            .execute()
            .then(()=> {
                return session.close();
            });
        console.log(result);

    } catch (error) {
        console.log(error);
        throw error;            
    }
}

export async function syncDatabase(products){
    try{
        const session = await mysqlx.getSession({ user: config.user, password: config.password })
       
        session.sql(`create database if not exists ${config.schema}`)
                .execute()
                .then(() => {
                    return session.sql(`create table if not exists ${config.schema}.${config.table} (
                        idProduct INT(11) NOT NULL AUTO_INCREMENT, barcode VARCHAR(20) NOT NULL, name VARCHAR(100) NOT NULL, 
                        salesName VARCHAR(100), qtd VARCHAR(10) NOT NULL, price VARCHAR(10) NOT NULL,
                        PRIMARY KEY(idProduct),UNIQUE INDEX barcode_UNIQUE (barcode ASC) VISIBLE)`)
                        .execute()
                })
                .then(()=>{
                    const table = session.getSchema(config.schema).getTable(config.table);
                    products.forEach(product => {
                        table.insert('barcode', 'name', 
                            'salesName', 'qtd', 'price')
                            .values(product.barcode, product.name, 
                                product.salesName, product.qtd, product.price)
                            .execute()
                    });
                    
                })
                .then(() => {
                    return session.close();
                });
        
    }catch(error){
        console.log(error);
    }
}

export async function getProduct(code) {
    try {
        const session = await mysqlx.getSession({ user: config.user, password: config.password });

        const table = session.getSchema(config.schema).getTable(config.table);
        
        const product = await table.select('barcode', 'name', 'salesName', 'qtd', 'price', 'lastUpdated')
            .where('barcode =' + code)
            .execute()
            .then(res =>{
                return res.fetchOne();
            })
        console.log(product);
        session.close();
        if (product == [] ||product == undefined)
            return null;
        return {'barcode': product[0], 'name': product[1], 'salesName': product[2], 
                'qtd':product[3], 'price': product[4], 'lastUpdated': product[5]};
    
    }catch(error){
        console.log(error);
        return undefined;   
    } 
    
}