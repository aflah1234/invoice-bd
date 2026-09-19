const express = require('express');
const router = express.Router();
const {
  getStores,
  getStore,
  getStoreItems,
  submitOrder,
  getMyOrders,
  getOrder,
  downloadQuotationPDF,
  downloadQuotationExcel,
  acceptQuotation,
  requestQuotationEdit,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

// All customer routes require customer role
router.use(protect, authorize('customer'));

// Stores & Items (browse)
router.get('/stores', getStores);
router.get('/stores/:id', getStore);
router.get('/stores/:id/items', getStoreItems);

// Orders
router.post('/orders', submitOrder);
router.get('/orders', getMyOrders);
router.get('/orders/:id', getOrder);
router.get('/orders/:id/quotation/pdf', downloadQuotationPDF);
router.get('/orders/:id/quotation/excel', downloadQuotationExcel);

// Quotation response actions
router.post('/orders/:id/accept', acceptQuotation);
router.post('/orders/:id/request-edit', requestQuotationEdit);

module.exports = router;
