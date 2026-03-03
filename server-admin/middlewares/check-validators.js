import { validationResult } from 'express-validator';

export const checkValidators = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            error: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg
            })),
        });
    }
    next();
}