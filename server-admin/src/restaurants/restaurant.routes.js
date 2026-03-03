'use strict';

import { Router } from "express";
import { 
    getRestaurants, 
    getRestaurantById, 
    createRestaurant, 
    updateRestaurant, 
    changeRestaurantStatus 
} from "./restaurant.controller.js";

import { 
    validateCreateRestaurant, 
    validateGetRestaurantById, 
    validateUpdateRestaurant, 
    validateRestaurantStatusChange 
} from "../../middlewares/restaurants-validators.js";

import { uploadRestaurantImage } from "../../middlewares/file-uploader.js";

const router = Router();

//GET
router.get('/', getRestaurants);
router.get('/:id', validateGetRestaurantById, getRestaurantById);

//POST
router.post('/', uploadRestaurantImage.single('photos'), validateCreateRestaurant, createRestaurant);

//PUT
router.put('/:id', uploadRestaurantImage.single('photos'), validateUpdateRestaurant, updateRestaurant);
router.put('/:id/activate', validateRestaurantStatusChange, changeRestaurantStatus);
router.put('/:id/desactivate', validateRestaurantStatusChange, changeRestaurantStatus);

export default router;