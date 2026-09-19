const express = require('express');
const router = express.Router();
const {
  getMyStore,
  updateStore,
  getItems,
  createItem,
  updateItem,
  deleteItem,
  deleteItemImage,
  getOrders,
  getOrder,
  updateOrderStatus,
  createAndSendInvoice,
  downloadInvoice,
} = require('../controllers/ownerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All owner routes require owner role
router.use(protect, authorize('owner'));

// Store
router.get('/store', getMyStore);
router.put('/store', upload.single('logo'), updateStore);

// Items
router.get('/items', getItems);
router.post('/items', upload.array('images', 5), createItem);
router.put('/items/:id', upload.array('images', 5), updateItem);
router.delete('/items/:id', deleteItem);
router.delete('/items/:id/image/:filename', deleteItemImage);

// Orders
router.get('/orders', getOrders);
router.get('/orders/:id', getOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/invoice', createAndSendInvoice);
router.get('/orders/:id/invoice/download', downloadInvoice);

module.exports = router;
