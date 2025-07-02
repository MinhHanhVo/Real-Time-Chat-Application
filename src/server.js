import express from 'express';
import 'dotenv/config';
import connection from './config/database.js';
import User from './models/user.js';



const app = express();
const port = process.env.PORT || 8081;


app.get('/', (req, res) => {
    res.send('Hello World!')
});

(async () => {
    //code here
    try {
        await connection();

        app.listen(port, () => {
            console.log(`Server chay cong ${port}`);
        })
    } catch (error) {
        console.log(">>>> Error connection to DB", error);

    }

})()
