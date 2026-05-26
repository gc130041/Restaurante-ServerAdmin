import { Router } from 'express';
import { 
    getCompanyEmployeesProxy,
    getCompanyEmployeeByIdProxy,
    createCompanyEmployeeProxy,
    updateCompanyEmployeeProxy,
    changeCompanyEmployeeStatusProxy
} from '../companies/company.controller.js';
import { validateJWT } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', validateJWT, getCompanyEmployeesProxy);
router.post('/', validateJWT, createCompanyEmployeeProxy);
router.get('/profile', validateJWT, (req, res) => {
    res.status(200).json({ 
        success: true, 
        data: {
            _id: req.user._id,
            name: req.user.email.split('@')[0],
            surname: '',
            username: req.user.email.split('@')[0],
            email: req.user.email,
            role: req.user.role,
            companyId: req.user.companyId,
            branchId: req.user.branchId
        } 
    });
});
router.get('/:id', validateJWT, getCompanyEmployeeByIdProxy);
router.put('/:id', validateJWT, updateCompanyEmployeeProxy);
router.put('/:id/activate', validateJWT, changeCompanyEmployeeStatusProxy);
router.put('/:id/desactivate', validateJWT, changeCompanyEmployeeStatusProxy);

export default router;
