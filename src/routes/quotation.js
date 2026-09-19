const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const generatePDF = require('../utils/generatePDF');
const generateExcel = require('../utils/generateExcel');
const { sendWhatsAppMessage, buildQuotationMessage, buildInvoiceMessage } = require('../utils/whatsapp');
const User = require('../models/User');
const path = require('path');

// @desc    Re-generate and re-send quotation for an existing order
// @route   POST /api/quotation/:orderId/resend
// @access  Private (customer or owner)
router.post('/:orderId/resend', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isCustomer =
      req.user.role === 'customer' && order.customer.toString() === req.user._id.toString();
    const isOwner =
      req.user.role === 'owner' && order.owner.toString() === req.user._id.toString();

    if (!isCustomer && !isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const type = req.body.type || 'quotation'; // 'quotation' or 'invoice'
    const pdfPath = await generatePDF(order, type);
    const excelPath = await generateExcel(order, type);

    if (type === 'quotation') {
      order.quotationPdfPath = pdfPath;
      order.quotationExcelPath = excelPath;
    } else {
      order.invoicePdfPath = pdfPath;
    }
    await order.save();

    // Send to customer WhatsApp
    let waSent = false;
    const customer = await User.findById(order.customer);
    if (customer && customer.whatsapp && customer.whatsappApiKey) {
      const msg =
        type === 'invoice' ? buildInvoiceMessage(order) : buildQuotationMessage(order);
      await sendWhatsAppMessage(customer.whatsapp, customer.whatsappApiKey, msg);
      waSent = true;
    }

    res.json({
      success: true,
      message: `${type} regenerated${waSent ? ' and sent via WhatsApp' : ''}`,
      pdfUrl:   `/api/quotation/${req.params.orderId}/file/pdf`,
      excelUrl: type === 'quotation' ? `/api/quotation/${req.params.orderId}/file/excel` : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
