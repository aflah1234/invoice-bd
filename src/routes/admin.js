const express = require('express');
const router = express.Router();
const {
  getStats,
  getOwners,
  createOwner,
  updateOwner,
  deleteOwner,
  resetOwnerPassword,
  getCustomers,
  getAllOrders,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All admin routes require admin role
router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/owners', getOwners);
router.post('/owners', upload.single('logo'), createOwner);
router.put('/owners/:id', updateOwner);
router.delete('/owners/:id', deleteOwner);
router.put('/owners/:id/reset-password', resetOwnerPassword);
router.get('/customers', getCustomers);
router.get('/orders', getAllOrders);

module.exports = router;
