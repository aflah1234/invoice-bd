const https = require('https');
const http = require('http');

/**
 * Send a WhatsApp message via CallMeBot API (free, no account needed after one-time setup).
 * Customer/Owner must first send "I allow callmebot to send me messages" to +34 644 60 49 16 on WhatsApp
 * and get their personal API key.
 *
 * @param {string} phone   - International format without + (e.g. 923001234567)
 * @param {string} apiKey  - CallMeBot API key for this phone number
 * @param {string} message - Text message to send
 */
const sendWhatsAppMessage = (phone, apiKey, message) => {
  return new Promise((resolve, reject) => {
    if (!phone || !apiKey) {
      console.warn('WhatsApp: missing phone or apiKey, skipping message send');
      return resolve({ skipped: true });
    }

    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMsg}&apikey=${apiKey}`;

    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log(`WhatsApp sent to ${phone}: ${res.statusCode}`);
          resolve({ statusCode: res.statusCode, body: data });
        });
      })
      .on('error', (err) => {
        console.error('WhatsApp send error:', err.message);
        reject(err);
      });
  });
};

/**
 * Build a quotation message string for WhatsApp
 */
const buildQuotationMessage = (order) => {
  const lines = order.items
    .map((i) => `• ${i.name} x${i.quantity} ${i.unit} @ ${i.price} = ${i.subtotal}`)
    .join('\n');

  return (
    `📋 *QUOTATION - ${order.orderNumber}*\n` +
    `Store: ${order.storeName}\n` +
    `Date: ${new Date(order.createdAt).toLocaleDateString()}\n\n` +
    `*Items:*\n${lines}\n\n` +
    `Subtotal: ${order.subtotal}\n` +
    (order.tax ? `Tax: ${order.tax}\n` : '') +
    (order.discount ? `Discount: -${order.discount}\n` : '') +
    `*Total: ${order.total}*\n\n` +
    (order.customerNote ? `Note: ${order.customerNote}\n` : '') +
    `Status: ${order.status.toUpperCase()}\n` +
    `Thank you for your order! 🙏`
  );
};

/**
 * Build an invoice message string for WhatsApp
 */
const buildInvoiceMessage = (order) => {
  const lines = order.items
    .map((i) => `• ${i.name} x${i.quantity} ${i.unit} @ ${i.price} = ${i.subtotal}`)
    .join('\n');

  return (
    `🧾 *INVOICE - ${order.orderNumber}*\n` +
    `Store: ${order.storeName}\n` +
    `Customer: ${order.customerName}\n` +
    `Date: ${new Date(order.createdAt).toLocaleDateString()}\n\n` +
    `*Items:*\n${lines}\n\n` +
    `Subtotal: ${order.subtotal}\n` +
    (order.tax ? `Tax: ${order.tax}\n` : '') +
    (order.discount ? `Discount: -${order.discount}\n` : '') +
    `*Total: ${order.total}*\n\n` +
    (order.ownerNote ? `Note: ${order.ownerNote}\n` : '') +
    `Status: ${order.status.toUpperCase()}\n` +
    `Please make payment at your earliest convenience. 🙏`
  );
};

module.exports = { sendWhatsAppMessage, buildQuotationMessage, buildInvoiceMessage };
