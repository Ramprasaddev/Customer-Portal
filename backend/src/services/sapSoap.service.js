const axios  = require('axios');
const xml2js = require('xml2js');
const https  = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const SAP_BASE_URL       = process.env.SAP_BASE_URL       || 'https://AZKTLDS5CP.kcloud.com:44300';
const SAP_INV_LIST_BASE  = process.env.SAP_INVOICE_LIST_BASE || SAP_BASE_URL;
const SAP_CLIENT         = process.env.SAP_CLIENT         || '100';
const SAP_USERNAME       = process.env.SAP_USERNAME        || 'portal_user';
const SAP_PASSWORD       = process.env.SAP_PASSWORD        || 'portal_pass';

console.log(`[SAP SERVICE] SAP_BASE_URL loaded as → ${SAP_BASE_URL}`);

const SAP_ENDPOINTS = {
  login:         `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zf_sd_9086_login_s?sap-client=${SAP_CLIENT}`,
  profile:       `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zsd_fm_get_profile_sw?sap-client=${SAP_CLIENT}`,
  dashboard:     `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zsd_fm_get_dashboard_sw?sap-client=${SAP_CLIENT}`,
  aging:         `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zfi_fm_get_aging_sw?sap-client=${SAP_CLIENT}`,
  finance:       `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zsd_fm_get_dashboard_sw?sap-client=${SAP_CLIENT}`,
  finDetail:     `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zfi_fm_get_fin_sw?sap-client=${SAP_CLIENT}`,
  invoice:       `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zfi_get_invoice_sw?sap-client=${SAP_CLIENT}`,
  invoiceList:   `${SAP_INV_LIST_BASE}/sap/bc/srt/scs/sap/zfi_customer_invo_sw?sap-client=${SAP_CLIENT}`,
  invoiceDetail: `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zfi_get_invoice_data?sap-client=${SAP_CLIENT}`,
  inquiryList:   `${SAP_BASE_URL}/sap/bc/srt/scs/sap/zfi_cust_inq_sw?sap-client=${SAP_CLIENT}`,
};

const SOAP_ACTIONS = {
  login:         'urn:sap-com:document:sap:rfc:functions:ZF_SD_9086_LOGIN',
  profile:       'urn:sap-com:document:sap:rfc:functions:ZSD_FM_GET_PROFILE',
  dashboard:     'urn:sap-com:document:sap:rfc:functions:ZSD_FM_GET_DASHBOARD',
  aging:         'urn:sap-com:document:sap:rfc:functions:ZFI_FM_GET_AGING',
  finance:       'urn:sap-com:document:sap:rfc:functions:ZFM_FM_GET_FIN',
  invoice:       'urn:sap-com:document:sap:rfc:functions:ZFI_GET_INVOICE',
  invoiceList:   'urn:sap-com:document:sap:rfc:functions:ZFI_CUSTOMER_INVO_FM',
  invoiceDetail: 'urn:sap-com:document:sap:rfc:functions:ZFI_GET_INVOICE_DATA',
  inquiryList:   'urn:sap-com:document:sap:rfc:functions:ZFI_CUST_INQ_FM',
};

// ─── Generic SOAP caller ────────────────────────────────────────────────────
async function callSoap(endpointKey, soapBody) {
  const url      = SAP_ENDPOINTS[endpointKey];
  const action   = SOAP_ACTIONS[endpointKey] || '';
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:sap-com:document:sap:rfc:functions">
  <soapenv:Header/>
  <soapenv:Body>
    ${soapBody}
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const res = await axios.post(url, envelope, {
      httpsAgent,
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction':   action,
      },
      auth:    { username: SAP_USERNAME, password: SAP_PASSWORD },
      timeout: 30000,
    });
    return parseXml(res.data);
  } catch (err) {
    // SAP sometimes returns HTTP 500 with a valid SOAP fault body
    if (err.response?.data) return parseXml(err.response.data);
    throw err;
  }
}

// ─── XML parser ─────────────────────────────────────────────────────────────
function parseXml(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, {
      explicitArray:     false,
      ignoreAttrs:       true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    }, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

// ─── Helper ─────────────────────────────────────────────────────────────────
const normalize = (data) => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

// ─── LOGIN ──────────────────────────────────────────────────────────────────
async function rfcLogin(kunnr, password) {
  const paddedKunnr = kunnr.toString().padStart(10, '0');
  const body = `<urn:ZF_SD_9086_LOGIN>
      <IV_KUNNR>${paddedKunnr}</IV_KUNNR>
      <IV_PASSWORD>${password}</IV_PASSWORD>
    </urn:ZF_SD_9086_LOGIN>`;

  const result = await callSoap('login', body);
  const resp   = result?.Envelope?.Body?.ZF_SD_9086_LOGINResponse;
  return {
    status:  resp?.EV_STATUS  || 'E',
    message: resp?.EV_MESSAGE || 'Login failed',
    kunnr:   paddedKunnr,
  };
}

// ─── PROFILE ────────────────────────────────────────────────────────────────
async function rfcGetProfile(kunnr) {
  const body = `<urn:ZSD_FM_GET_PROFILE>
      <IV_KUNNR>${kunnr}</IV_KUNNR>
    </urn:ZSD_FM_GET_PROFILE>`;

  const result = await callSoap('profile', body);
  const resp   = result?.Envelope?.Body?.ZSD_FM_GET_PROFILEResponse;
  return { profile: resp?.ES_PROFILE || {}, message: resp?.EV_MESSAGE || '' };
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────
async function rfcGetDashboard(kunnr, dateFrom, dateTo) {
  const body = `<urn:ZSD_FM_GET_DASHBOARD>
      <IV_KUNNR>${kunnr}</IV_KUNNR>
      <IV_DATE_FROM>${dateFrom}</IV_DATE_FROM>
      <IV_DATE_TO>${dateTo}</IV_DATE_TO>
    </urn:ZSD_FM_GET_DASHBOARD>`;

  const result = await callSoap('dashboard', body);
  const resp   = result?.Envelope?.Body?.ZSD_FM_GET_DASHBOARDResponse;
  return {
    deliveries: normalize(resp?.ET_DELIVERY?.item),
    orders:     normalize(resp?.ET_SALES_ORDER?.item ?? resp?.ET_ORDERS?.item),
    invoices:   normalize(resp?.ET_INVOICE?.item),
    returns:    normalize(resp?.ET_RETURNS?.item),
    openOrders: normalize(resp?.ET_OPEN_ORDERS?.item),
  };
}

// ─── FINANCE ────────────────────────────────────────────────────────────────
async function rfcGetFinance(kunnr, dateFrom, dateTo) {
  const body = `<urn:ZFM_FM_GET_FIN>
      <IV_KUNNR>${kunnr}</IV_KUNNR>
      <IV_DATE_FROM>${dateFrom}</IV_DATE_FROM>
      <IV_DATE_TO>${dateTo}</IV_DATE_TO>
    </urn:ZFM_FM_GET_FIN>`;

  const result = await callSoap('finDetail', body);
  const resp   = result?.Envelope?.Body?.ZFM_FM_GET_FINResponse;
  return {
    creditDebit: normalize(resp?.ET_CREDIT_DEBIT?.item),
    invoices:    normalize(resp?.ET_INVOICE?.item),
  };
}

// ─── AGING ──────────────────────────────────────────────────────────────────
async function rfcGetAging(kunnr) {
  const body = `<urn:ZFI_FM_GET_AGING>
      <IV_KUNNR>${kunnr}</IV_KUNNR>
    </urn:ZFI_FM_GET_AGING>`;

  const result = await callSoap('aging', body);
  const resp   = result?.Envelope?.Body?.ZFI_FM_GET_AGINGResponse;
  return { aging: normalize(resp?.ET_AGING?.item) };
}

// ─── INVOICES (legacy ZFI_GET_INVOICE) ─────────────────────────────────────
async function rfcGetInvoice(kunnr, dateFrom, dateTo) {
  const body = `<urn:ZFI_GET_INVOICE>
      <IV_KUNNR>${kunnr}</IV_KUNNR>
      <IV_DATE_FROM>${dateFrom}</IV_DATE_FROM>
      <IV_DATE_TO>${dateTo}</IV_DATE_TO>
    </urn:ZFI_GET_INVOICE>`;

  try {
    const result = await callSoap('invoice', body);
    const resp   = result?.Envelope?.Body?.ZFI_GET_INVOICEResponse;
    const invoices = normalize(resp?.ET_INVOICE?.item)
                  || normalize(resp?.ET_INVOICES?.item)
                  || [];
    return { invoices };
  } catch (err) {
    const finData = await rfcGetFinance(kunnr, dateFrom, dateTo);
    return { invoices: finData.invoices || [] };
  }
}

// ─── INVOICE LIST  (ZFI_CUSTOMER_INVO_FM) ──────────────────────────────────
// URL : https://AZKTLDS5CP.kcloud.com:44300/sap/bc/srt/scs/sap/zfi_customer_invo_sw
// Input : IV_CUSTOMER_ID  (plain integer — no leading zeros)
// Output: EV_INVOICES table → VBELN, FKDAT, NETWR, WAERK, KUNAG, VKORG, ERDAT, VTWEG
async function rfcGetCustomerInvoiceList(customerId) {
  const body = `<urn:ZFI_CUSTOMER_INVO_FM>
      <IV_CUSTOMER_ID>${customerId}</IV_CUSTOMER_ID>
    </urn:ZFI_CUSTOMER_INVO_FM>`;

  try {
    const result  = await callSoap('invoiceList', body);
    const resp    = result?.Envelope?.Body?.ZFI_CUSTOMER_INVO_FMResponse;
    
    // Handle multiple possible response structures
    let invoices = normalize(resp?.EV_INVOICES?.item)
                || normalize(resp?.ET_INVOICES?.item)
                || normalize(resp?.EV_INVOICES)
                || normalize(resp?.ET_INVOICES)
                || [];
    
    console.log('[INVOICE LIST] Response received - Total invoices:', invoices.length);
    if (invoices.length) console.log('[INVOICE LIST] Sample VBELN:', invoices[0].VBELN, '| total:', invoices.length);
    return { invoices };
  } catch (err) {
    console.error('[INVOICE LIST] SAP Error:', err.message);
    // Return empty array as fallback
    return { invoices: [] };
  }
}

// ─── Low-level SOAP call with explicit action string ────────────────────────
async function callSoapRaw(endpointKey, soapBody, soapAction) {
  const url = SAP_ENDPOINTS[endpointKey];
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:sap-com:document:sap:rfc:functions">
  <soapenv:Header/>
  <soapenv:Body>
    ${soapBody}
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await axios.post(url, envelope, {
    httpsAgent,
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction'  : soapAction,
    },
    auth   : { username: SAP_USERNAME, password: SAP_PASSWORD },
    timeout: 30000,
  });
  return parseXml(res.data);
}

// ─── INVOICE DETAIL + PDF  (ZFI_GET_INVOICE_DATA) ──────────────────────────
// Tries a matrix of VBELN formats × SOAPAction quoting styles.
// Logs the exact request so you can compare with your working Postman request.
async function rfcGetInvoiceDetail(vbeln) {
  const raw      = vbeln.toString().trim();
  const stripped = raw.replace(/^0+/, '') || raw;   // e.g. "90000218"
  const padded   = raw.padStart(10, '0');            // e.g. "0090000218"

  const vbelnCandidates = [...new Set([raw, stripped, padded])];

  // SOAPAction variants: Postman wraps in quotes, our generic caller does not
  const baseAction = SOAP_ACTIONS['invoiceDetail'];
  const actionCandidates = [
    `"${baseAction}"`,   // quoted  — Postman default / WS-I compliant
    baseAction,          // unquoted — our existing style
    '',                  // empty   — some SAP endpoints accept this
  ];

  console.log('[INVOICE DETAIL] ── Starting matrix retry ──');
  console.log('[INVOICE DETAIL] VBELNs  :', vbelnCandidates);
  console.log('[INVOICE DETAIL] Endpoint:', SAP_ENDPOINTS['invoiceDetail']);

  let lastError = null;

  for (const action of actionCandidates) {
    for (const candidate of vbelnCandidates) {
      const body = `<urn:ZFI_GET_INVOICE_DATA>
      <IV_VBELN>${candidate}</IV_VBELN>
    </urn:ZFI_GET_INVOICE_DATA>`;

      console.log(`[INVOICE DETAIL] Trying VBELN="${candidate}" SOAPAction=${action || '(empty)'}`);

      try {
        let result;
        try {
          result = await callSoapRaw('invoiceDetail', body, action);
        } catch (httpErr) {
          // SAP returns HTTP 500 with SOAP Fault body on RABAX
          if (httpErr.response?.data) {
            result = await parseXml(httpErr.response.data);
          } else {
            throw httpErr;
          }
        }

        const soapBody = result?.Envelope?.Body;

        if (soapBody?.Fault) {
          const msg = (soapBody.Fault.faultstring || soapBody.Fault.faultcode || '').trim();
          console.warn(`  → Fault: ${msg}`);
          lastError = new Error(msg || 'SAP SOAP Fault');
          continue;
        }

        const resp = soapBody?.ZFI_GET_INVOICE_DATAResponse;
        if (!resp) {
          console.warn('  → Empty / unexpected response body');
          lastError = new Error('Empty SAP response');
          continue;
        }

        // ── SUCCESS ──
        console.log(`[INVOICE DETAIL] ✓ Success — VBELN="${candidate}" action=${action || '(empty)'}`);

        const header    = resp.ES_HEADER || {};
        const items     = normalize(resp.ET_ITEMS?.item);
        const rawPdf    = resp.EV_PDF_XSTRING;
        const pdfBase64 = (typeof rawPdf === 'string' && rawPdf.trim())
          ? rawPdf.replace(/&#x[0-9A-Fa-f]+;/g, '').replace(/\s+/g, '')
          : '';

        console.log(`[INVOICE DETAIL] PDF bytes: ${pdfBase64.length} | Items: ${items.length}`);
        return { header, items, pdfBase64 };

      } catch (err) {
        console.warn(`  → Error: ${err.message}`);
        lastError = err;
      }
    }
  }

  const errMsg = lastError?.message || 'Invoice PDF unavailable';
  console.error('[INVOICE DETAIL] All combinations failed. Last:', errMsg);
  throw new Error(errMsg);
}

// ─── CUSTOMER INQUIRIES  (ZFI_CUST_INQ_FM) ─────────────────────────────────
// URL : https://AZKTLDS5CP.kcloud.com:44300/sap/bc/srt/scs/sap/zfi_cust_inq_sw
// Input : IV_KUNNR  (customer number)
// Output: ET_INQUIRIES table → VBELN, ERDAT, ANGDT, BNDDT, NETWR, WAERK, MATNR, MAKTX, KWMENG, VRKME
async function rfcGetCustomerInquiries(kunnr) {
  const paddedKunnr = kunnr.toString().trim().padStart(10, '0');

  const body = `<urn:ZFI_CUST_INQ_FM>
      <IV_KUNNR>${paddedKunnr}</IV_KUNNR>
    </urn:ZFI_CUST_INQ_FM>`;

  const result = await callSoap('inquiryList', body);
  const body_  = result?.Envelope?.Body;

  if (body_?.Fault) {
    const msg = body_.Fault.faultstring || body_.Fault.faultcode || 'SAP SOAP Fault';
    console.error('[INQUIRY LIST] SOAP Fault:', msg);
    throw new Error(msg);
  }

  const resp = body_?.ZFI_CUST_INQ_FMResponse;
  const inquiries = normalize(resp?.ET_INQUIRIES?.item);
  console.log('[INQUIRY LIST] count:', inquiries.length, '| sample VBELN:', inquiries[0]?.VBELN || 'none');
  return { inquiries };
}

// ─── SALES ORDERS ONLY  (ET_SALES_ORDER from ZSD_FM_GET_DASHBOARD) ───────────
// SAP returns ET_DELIVERY + ET_INQUIRY + ET_SALES_ORDER in one call.
// This function ignores delivery and inquiry — only ET_SALES_ORDER is used.
async function rfcGetSalesOrders(kunnr, dateFrom, dateTo) {
  // SAP KUNNR must be exactly 10 digits with leading zeros
  const paddedKunnr = kunnr.toString().trim().padStart(10, '0');

  const url = SAP_ENDPOINTS['dashboard'];
  console.log('═══════════════════════════════════════════════════');
  console.log('[SALES ORDERS] Endpoint :', url);
  console.log('[SALES ORDERS] KUNNR    :', paddedKunnr);
  console.log('[SALES ORDERS] DateFrom :', dateFrom);
  console.log('[SALES ORDERS] DateTo   :', dateTo);
  console.log('═══════════════════════════════════════════════════');

  const body = `<urn:ZSD_FM_GET_DASHBOARD>
      <IV_KUNNR>${paddedKunnr}</IV_KUNNR>
      <IV_DATE_FROM>${dateFrom}</IV_DATE_FROM>
      <IV_DATE_TO>${dateTo}</IV_DATE_TO>
    </urn:ZSD_FM_GET_DASHBOARD>`;

  const result = await callSoap('dashboard', body);
  const soapBody = result?.Envelope?.Body;

  // ── SOAP Fault detection — surface the real SAP error ──
  if (soapBody?.Fault) {
    const faultMsg = soapBody.Fault.faultstring || soapBody.Fault.faultcode || 'SAP SOAP Fault';
    console.error('[SALES ORDERS] ✗ SOAP Fault:', faultMsg);
    throw new Error(`SAP Error: ${faultMsg}`);
  }

  const resp = soapBody?.ZSD_FM_GET_DASHBOARDResponse;

  // ── Log the full response keys so we can see what SAP returned ──
  if (resp) {
    console.log('[SALES ORDERS] Response keys:', Object.keys(resp));
    console.log('[SALES ORDERS] ET_SALES_ORDER raw:', JSON.stringify(resp?.ET_SALES_ORDER)?.slice(0, 200));
  } else {
    console.error('[SALES ORDERS] ✗ No ZSD_FM_GET_DASHBOARDResponse in body. Full body keys:', Object.keys(soapBody || {}));
  }

  // ── Extract ONLY ET_SALES_ORDER (ignore ET_DELIVERY and ET_INQUIRY) ──
  const salesOrders = normalize(resp?.ET_SALES_ORDER?.item ?? resp?.ET_ORDERS?.item);

  console.log(`[SALES ORDERS] ✓ ET_SALES_ORDER count = ${salesOrders.length}`);
  if (salesOrders.length) {
    const s = salesOrders[0];
    console.log(`[SALES ORDERS] Sample → VBELN:${s.VBELN} ERDAT:${s.ERDAT} NETWR:${s.NETWR} WAERK:${s.WAERK} GBSTA:${s.GBSTA}`);
  }

  return { salesOrders };
}

module.exports = {
  rfcLogin,
  rfcGetProfile,
  rfcGetDashboard,
  rfcGetSalesOrders,
  rfcGetFinance,
  rfcGetAging,
  rfcGetInvoice,
  rfcGetCustomerInvoiceList,
  rfcGetInvoiceDetail,
  rfcGetCustomerInquiries,
};
