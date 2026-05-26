'use strict';

//Importaciones
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { corsOptions } from './cors-configuration.js';
import { dbConnection } from '../configs/db.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { errorHandlerGlobal } from '../middlewares/handle-errors.js';
import { antiCsrfGuard } from '../middlewares/auth.middleware.js';
import csrfEnforcer from '../middlewares/csrf-enforcer.middleware.js';

//Rutas
import tablesRoutes from '../src/tables/table.routes.js';
import menusRoutes from '../src/menus/menu.routes.js';
import reservationsRoutes from '../src/reservations/reservation.routes.js';
import orderRoutes from '../src/orders/order.routes.js';
import branchRoutes from '../src/branchs/branch.routes.js'; 
import companyRoutes from '../src/companies/company.routes.js'; 
import ingredientRoutes from '../src/ingredients/ingredient.routes.js'; 
import usersRoutes from '../src/users/user.routes.js';
import stockRoutes from '../src/stocks/stock.routes.js'; 
import invoiceRoutes from '../src/invoices/invoice.routes.js';


const BASE_URL = '/api/v1';

//Configuración de mi aplicación
//Se almacena en una funcion para que pueda ser exportada 
// Usada al crear la instancia de la aplicacion
const middlewares = (app) => {
    app.use(express.urlencoded( { extended: false, limit: '10mb'}));
    app.use(express.json({limit: '10mb'}));
    app.use(cors(corsOptions));
    app.use(cookieParser());
    app.use(antiCsrfGuard);
    app.use(csrfEnforcer);
    app.use(morgan('dev'));
}


//Integracion de todas las rutas
const routes = (app) => {
    app.use(`${BASE_URL}/companies`, companyRoutes);
    app.use(`${BASE_URL}/users`, usersRoutes);
    app.use(`${BASE_URL}/ingredients`, ingredientRoutes);
    app.use(`${BASE_URL}/stocks`, stockRoutes);
    app.use(`${BASE_URL}/branches`, branchRoutes);
    app.use(`${BASE_URL}/tables`, tablesRoutes);
    app.use(`${BASE_URL}/menus`, menusRoutes);
    app.use(`${BASE_URL}/reservations`, reservationsRoutes);
    app.use(`${BASE_URL}/orders`, orderRoutes);
    app.use(`${BASE_URL}/invoices`, invoiceRoutes);

}

//FUNDIC“N PARA INICIAR EL SERVIDOR
const initServer = async (app) => {
    //Creación de la instancia de la aplicaccion
    app = express();
    const PORT = process.env.PORT || 3001
    try {
        //CONFIGURACIONES DEL MIDDLEWARES (Mi aplicacin)
        dbConnection();
        middlewares(app);
        
        // Swagger UI Config
        app.use(`${BASE_URL}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
        
        routes(app);
        
        // Manejador Global de Errores - Siempre de último
        app.use(errorHandlerGlobal);

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
            console.log(`Base URL: http://localhost:${PORT}${BASE_URL}`);
        });

        //Primera ruta
        app.get(`${BASE_URL}/health`, (req, res)=> {
            res.status(200).json(
                {
                status: 'ok',
                service: 'Restaurante ERP API',
                version: '1.0.0'
                }
            );
        });
    } catch (error) {
        console.log(error);
    }
}

export { initServer};
