import "reflect-metadata";
import express from "express";
import { createConnection } from "typeorm"; 
import { __prod__ } from "./constants";
import { join } from "path";
import { postgresPW } from "./passwords";


const main = async () => {
    // might need to set username and password
    await createConnection({
        type: 'postgres',
        database: 'snippetbox',
        username :'postgres',
        password: postgresPW,
        entities: [join(__dirname, './entities/*.*')],
        logging: !__prod__,
        synchronize: !__prod__,
    });
    const app = express();
    app.get('/', (_req, res) => {
        res.send("hello");
    });
    app.listen(3002, () => {
        console.log("listening on localhost:3002");
    });
};

main();