// src/routes/index.js
const express     = require('express');
const router      = express.Router();
const authCtrl    = require('../controllers/auth.controller');
const custCtrl    = require('../controllers/customer.controller');
const authMW      = require('../middleware/auth.middleware');

// ─── PUBLIC ──────────────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login);

// ─── PROTECTED (require JWT) ─────────────────────────────────────────────────
router.get('/customer/profile',                    authMW, custCtrl.getProfile);
router.get('/customer/dashboard',                  authMW, custCtrl.getDashboard);
router.get('/customer/finance',                    authMW, custCtrl.getFinance);
router.get('/customer/aging',                      authMW, custCtrl.getAging);
router.get('/customer/deliveries',                 authMW, custCtrl.getDeliveries);
router.get('/customer/orders',                     authMW, custCtrl.getOrders);
router.get('/customer/inquiries',                  authMW, custCtrl.getInquiries);
router.get('/customer/invoices',                   authMW, custCtrl.getInvoices);
// New dedicated invoice portal APIs (ZFI_CUSTOMER_INVO_FM + ZFI_GET_INVOICE_DATA)
router.get('/customer/invoice-list',               authMW, custCtrl.getCustomerInvoiceList);
router.get('/customer/invoice-detail/:vbeln',      authMW, custCtrl.getInvoiceDetail);
router.get('/customer/invoice-pdf/:vbeln',         authMW, custCtrl.downloadInvoicePdf);
router.get('/customer/inquiry-list',               authMW, custCtrl.getCustomerInquiryList);

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

module.exports = router;
