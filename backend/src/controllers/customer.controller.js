// src/controllers/customer.controller.js
const {
  rfcGetProfile,
  rfcGetDashboard,
  rfcGetSalesOrders,
  rfcGetFinance,
  rfcGetAging,
  rfcGetInvoice,
  rfcGetCustomerInvoiceList,
  rfcGetInvoiceDetail,
  rfcGetCustomerInquiries,
} = require('../services/sapSoap.service');

// ─── PROFILE ─────────────────────────────────────────────────────────────────
async function getProfile(req, res) {
  try {
    const kunnr = req.user.kunnr;
    const data  = await rfcGetProfile(kunnr);
    res.json({ success: true, data: data.profile, message: data.message });
  } catch (err) {
    console.error('[PROFILE] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: err.message });
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
async function getDashboard(req, res) {
  try {
    const kunnr    = req.user.kunnr;
    const dateFrom = req.query.dateFrom || '2024-01-01';
    const dateTo   = req.query.dateTo   || new Date().toISOString().split('T')[0];

    const data = await rfcGetDashboard(kunnr, dateFrom, dateTo);

    // Build summary KPIs
    const summary = {
      totalDeliveries: data.deliveries.length,
      totalOrders:     data.orders.length,
      totalInvoices:   data.invoices.length,
      openOrders:      data.openOrders.length,
      completedDeliveries: data.deliveries.filter(d => d.GBSTA === 'C').length,
    };

    res.json({ success: true, data: { ...data, summary } });
  } catch (err) {
    console.error('[DASHBOARD] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard', error: err.message });
  }
}

// ─── FINANCE / CREDIT-DEBIT ───────────────────────────────────────────────────
async function getFinance(req, res) {
  try {
    const kunnr    = req.user.kunnr;
    const dateFrom = req.query.dateFrom || '2024-01-01';
    const dateTo   = req.query.dateTo   || new Date().toISOString().split('T')[0];
    const search   = (req.query.search || '').toLowerCase();

    let data = await rfcGetFinance(kunnr, dateFrom, dateTo);

    // Search filter
    if (search) {
      data.creditDebit = data.creditDebit.filter(item =>
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
      data.invoices = data.invoices.filter(item =>
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[FINANCE] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch finance data', error: err.message });
  }
}

// ─── AGING ───────────────────────────────────────────────────────────────────
async function getAging(req, res) {
  try {
    const kunnr  = req.user.kunnr;
    const search = (req.query.search || '').toLowerCase();

    let data = await rfcGetAging(kunnr);

    // Search filter
    if (search) {
      data.aging = data.aging.filter(item =>
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
    }

    // Bucket summary for chart
    const bucketSummary = data.aging.reduce((acc, item) => {
      const bucket = item.AGING_BUCKET || 'Unknown';
      if (!acc[bucket]) acc[bucket] = { count: 0, total: 0, currency: item.WAERK };
      acc[bucket].count++;
      acc[bucket].total += parseFloat(item.NETWR) || 0;
      return acc;
    }, {});

    res.json({ success: true, data: { ...data, bucketSummary } });
  } catch (err) {
    console.error('[AGING] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch aging data', error: err.message });
  }
}

// ─── DELIVERIES (from dashboard data) ────────────────────────────────────────
async function getDeliveries(req, res) {
  try {
    const kunnr    = req.user.kunnr;
    const dateFrom = req.query.dateFrom || '2024-01-01';
    const dateTo   = req.query.dateTo   || new Date().toISOString().split('T')[0];
    const search   = (req.query.search || '').toLowerCase();

    const data = await rfcGetDashboard(kunnr, dateFrom, dateTo);
    let deliveries = data.deliveries;

    if (search) {
      deliveries = deliveries.filter(item =>
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data: deliveries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch deliveries', error: err.message });
  }
}

// ─── SALES ORDERS  (ET_SALES_ORDER — delivery & inquiry are ignored) ──────────
async function getOrders(req, res) {
  try {
    const kunnr    = req.user.kunnr;
    const dateFrom = req.query.dateFrom || '2024-01-01';
    const dateTo   = req.query.dateTo   || new Date().toISOString().split('T')[0];
    const search   = (req.query.search || '').toLowerCase();

    // Uses dedicated function — only ET_SALES_ORDER is returned, delivery and inquiry are ignored
    const { salesOrders } = await rfcGetSalesOrders(kunnr, dateFrom, dateTo);
    let orders = salesOrders;

    if (search) {
      orders = orders.filter(item =>
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('[SALES ORDERS] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch sales orders', error: err.message });
  }
}

// ─── INQUIRIES ───────────────────────────────────────────────────────────────
async function getInquiries(req, res) {
  try {
    const kunnr    = req.user.kunnr;
    const dateFrom = req.query.dateFrom || '2024-01-01';
    const dateTo   = req.query.dateTo   || new Date().toISOString().split('T')[0];
    const search   = (req.query.search  || '').toLowerCase();

    // Fetch inquiries via SAP RFC (AUART = 'IN' = Inquiry document type)
    let inquiries = [];
    try {
      const data = await rfcGetDashboard(kunnr, dateFrom, dateTo);
      // Filter orders for inquiry document types (AUART = 'IN' or 'ZKIN' etc.)
      inquiries = (data.orders || []).filter(o =>
        ['IN', 'ZKIN', 'AF', 'ZZIN'].includes((o.AUART || '').toUpperCase())
      );
      // If no inquiries found via order types, check the dedicated inquiries array if present
      if (inquiries.length === 0 && data.inquiries) {
        inquiries = data.inquiries;
      }
    } catch (e) {
      console.warn('[INQUIRIES] Falling back to empty array:', e.message);
      inquiries = [];
    }

    if (search) {
      inquiries = inquiries.filter(item =>
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data: inquiries, total: inquiries.length });
  } catch (err) {
    console.error('[INQUIRIES] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch inquiries', error: err.message });
  }
}

// ─── INVOICES (dedicated ZFI_GET_INVOICE endpoint) ───────────────────────────
async function getInvoices(req, res) {
  try {
    const kunnr    = req.user.kunnr;
    const dateFrom = req.query.dateFrom || '2024-01-01';
    const dateTo   = req.query.dateTo   || new Date().toISOString().split('T')[0];
    const search   = (req.query.search  || '').toLowerCase();

    let data = await rfcGetInvoice(kunnr, dateFrom, dateTo);

    if (search) {
      data.invoices = data.invoices.filter(item =>
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data: { invoices: data.invoices, total: data.invoices.length } });
  } catch (err) {
    console.error('[INVOICES] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices', error: err.message });
  }
}

// ─── CUSTOMER INVOICE LIST (ZFI_CUSTOMER_INVO_FM) ───────────────────────────
async function getCustomerInvoiceList(req, res) {
  try {
    const kunnr      = req.user.kunnr;
    const customerId = kunnr.toString().trim();

    console.log('[INVOICE LIST] Fetching for KUNNR:', kunnr);
    const data   = await rfcGetCustomerInvoiceList(customerId);
    const search = (req.query.search || '').toLowerCase();

    let invoices = data.invoices || [];
    
    // Fallback: if no invoices from dedicated service, try generic invoice endpoint
    if (!invoices || invoices.length === 0) {
      console.log('[INVOICE LIST] No invoices from ZFI_CUSTOMER_INVO_FM, trying ZFI_GET_INVOICE...');
      const dateFrom = req.query.dateFrom || '2024-01-01';
      const dateTo   = req.query.dateTo   || new Date().toISOString().split('T')[0];
      const fallbackData = await rfcGetInvoice(kunnr, dateFrom, dateTo);
      invoices = fallbackData.invoices || [];
    }
    
    if (search) {
      invoices = invoices.filter(i =>
        Object.values(i).some(v => String(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data: { invoices, total: invoices.length } });
  } catch (err) {
    console.error('[INVOICE LIST] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice list', error: err.message });
  }
}

// ─── SINGLE INVOICE DETAIL + PDF (ZFI_GET_INVOICE_DATA) ──────────────────────
async function getInvoiceDetail(req, res) {
  try {
    const { vbeln } = req.params;
    if (!vbeln || vbeln.trim() === '') {
      return res.status(400).json({ success: false, message: 'VBELN is required' });
    }

    console.log('[INVOICE DETAIL] Fetching details for VBELN:', vbeln);
    const data = await rfcGetInvoiceDetail(vbeln);
    
    console.log('[INVOICE DETAIL] Successfully retrieved:', {
      vbeln: data.header?.VBELN,
      customer: data.header?.NAME1,
      amount: data.header?.RMWWR,
      currency: data.header?.WAERS,
      itemCount: data.items?.length || 0,
      hasPdf: !!data.pdfBase64 && data.pdfBase64.length > 0
    });
    
    // Return as JSON with pdfBase64 as string
    // Frontend will convert base64 to Blob for download/preview
    res.json({ 
      success: true, 
      data: {
        header: data.header,
        items: data.items,
        pdfBase64: data.pdfBase64  // Base64 string — frontend handles binary conversion
      }
    });
  } catch (err) {
    console.error('[INVOICE DETAIL] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice detail', error: err.message });
  }
}

// ─── DIRECT PDF DOWNLOAD (returns actual PDF file for direct download) ────────
async function downloadInvoicePdf(req, res) {
  try {
    const { vbeln } = req.params;
    if (!vbeln || vbeln.trim() === '') {
      return res.status(400).json({ success: false, message: 'VBELN is required' });
    }

    console.log('[PDF DOWNLOAD] Fetching PDF for VBELN:', vbeln);
    const data = await rfcGetInvoiceDetail(vbeln);
    
    if (!data.pdfBase64 || data.pdfBase64.trim() === '') {
      return res.status(404).json({ success: false, message: 'No PDF data available for this invoice' });
    }

    // Convert base64 to Buffer
    const pdfBuffer = Buffer.from(data.pdfBase64, 'base64');
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${vbeln}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log('[PDF DOWNLOAD] Sending PDF buffer of size:', pdfBuffer.length, 'bytes');
    
    // Send PDF as binary data
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF DOWNLOAD] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to download invoice PDF', error: err.message });
  }
}

// ─── CUSTOMER INQUIRY LIST (ZFI_CUST_INQ_FM) ─────────────────────────────────
async function getCustomerInquiryList(req, res) {
  try {
    const kunnr  = req.user.kunnr;
    const search = (req.query.search || '').toLowerCase();

    const data = await rfcGetCustomerInquiries(kunnr);
    let inquiries = data.inquiries || [];

    if (search) {
      inquiries = inquiries.filter(i =>
        Object.values(i).some(v => String(v).toLowerCase().includes(search))
      );
    }

    res.json({ success: true, data: { inquiries, total: inquiries.length } });
  } catch (err) {
    console.error('[INQUIRY LIST] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch inquiries', error: err.message });
  }
}

module.exports = {
  getProfile,
  getDashboard,
  getFinance,
  getAging,
  getDeliveries,
  getOrders,
  getInquiries,
  getInvoices,
  getCustomerInvoiceList,
  getInvoiceDetail,
  downloadInvoicePdf,
  getCustomerInquiryList,
};
