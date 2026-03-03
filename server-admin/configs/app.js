'use strict';

//Importaciones
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { corsOptions } from './cors-configuration.js';
import { dbConnection } from '../configs/db.js';

//Rutas
import restaurantsRoutes from '../src/restaurants/restaurant.routes.js';
import tablesRoutes from '../src/tables/table.routes.js';
import menusRoutes from '../src/menus/menu.routes.js';
import reservationsRoutes from '../src/reservations/reservation.routes.js';
import usersRoutes from '../src/users/user.routes.js'
import orderRoutes from '../src/orders/order.routes.js';

const BASE_URL = '/restaurant/v1';

//Configuración de mi aplicación
//Se almacena en una funcion para que pueda ser exportada 
// Usada al crear la instancia de la aplicacion
const middlewares = (app) => {
    app.use(express.urlencoded( { extended: false, limit: '10mb'}));
    app.use(express.json({limit: '10mb'}));
    app.use(cors(corsOptions));
    app.use(morgan('dev'));
}


//Integracion de todas las rutas
const routes = (app) => {
    app.use(`${BASE_URL}/restaurants`, restaurantsRoutes);
    app.use(`${BASE_URL}/tables`, tablesRoutes);
    app.use(`${BASE_URL}/menus`, menusRoutes);
    app.use(`${BASE_URL}/reservations`, reservationsRoutes);
    app.use(`${BASE_URL}/orders`, orderRoutes);
    app.use(`${BASE_URL}/users`, usersRoutes);
}

//FUNCIÓN PARA INICIAR EL SERVIDOR
const initServer = async (app) => {
    //Creación de la instancia de la aplicaccion
    app = express();
    const PORT = process.env.PORT || 3001
    try {
        //CONFIGURACIONES DEL MIDDLEWARES (Mi aplicación)
        dbConnection();
        middlewares(app);
        routes(app);

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
            console.log(`Base URL: http://localhost:${PORT}${BASE_URL}`);
        });

        //Primera ruta
        app.get(`${BASE_URL}/health`, (req, res)=> {
            res.status(200).json(
                {
                status: 'ok',
                service: 'Restaurant Admin',
                version: '1.0.0'
                }
            );
        });
    } catch (error) {
        console.log(error);
    }
}

export { initServer};
