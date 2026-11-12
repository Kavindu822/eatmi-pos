import { Sale } from './types';
import { formatRupees, formatShortRupees } from './utils';

export interface ReceiptOptions {
  sale: Sale;
  customerPointsBalance?: number;
  settings?: Record<string, string>;
  slipType: 'customer' | 'kitchen';
  paperWidth?: '80mm' | '58mm';
  showLogo?: boolean;
}

export function generateReceiptHtml({
  sale,
  customerPointsBalance,
  settings = {},
  slipType,
  paperWidth: forcedPaperWidth,
  showLogo: forcedShowLogo
}: ReceiptOptions): string {
  let items: any[] = [];
  try {
    items = JSON.parse(sale.items);
  } catch (e) {
    items = [];
  }

  const paperWidth = forcedPaperWidth || settings.receipt_paper_width || '80mm';
  const showLogo = forcedShowLogo !== undefined ? forcedShowLogo : settings.receipt_show_logo !== 'false';
  const density = settings.receipt_print_density || 'normal';
  const fontStyle = settings.receipt_font_style || 'sans';
  const fontSizeSetting = settings.receipt_font_size || 'normal';
  const showLoyalty = settings.receipt_show_loyalty !== 'false';
  const showBarcode = settings.receipt_show_barcode === 'true';

  const storeName = settings.receipt_store_name || 'EATmi BAKERY & CAFE';
  const tagline = settings.receipt_tagline || 'ARTISAN PÂTISSERIE & ROASTERY';
  const address = settings.receipt_address || 'No. 07, Eugine Balasuriya Mawatha, Nupe, Matara';
  const phone = settings.receipt_phone || '0740546060';
  const headerNote = settings.receipt_header_note || 'TAX INVOICE / RECEIPT';
  const footer1 = settings.receipt_footer_1 || '*** THANK YOU FOR VISITING! ***';
  const footer2 = settings.receipt_footer_2 || 'Fresh bakes served with passion daily.';
  const loyaltyRate = Math.max(1, Number(settings.loyalty_rate_rupees) || 300);

  const is80 = paperWidth === '80mm';
  const widthMm = is80 ? '72mm' : '48mm';
  const baseFontSize = is80 ? (fontSizeSetting === 'large' ? '12px' : '11px') : '9.5px';
  const headFontSize = is80 ? '14.5px' : '12px';
  const totalFontSize = is80 ? '14.5px' : '12.5px';
  const logoWidth = is80 ? '68px' : '52px';

  const fontFamily = fontStyle === 'mono'
    ? `'Courier New', Courier, monospace`
    : `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

  const baseFontWeight = density === 'ultra_dark' ? '600' : '400';

  const formattedDate = new Date(sale.created).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  if (slipType === 'kitchen') {
    // -------------------------------------------------------------
    // KITCHEN ORDER TICKET (KOT) - NORMAL CLEAN & INK-EFFICIENT
    // -------------------------------------------------------------
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KOT #${sale.id}</title>
  <style>
    @page { size: auto; margin: 0mm !important; }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      font-family: ${fontFamily};
      font-size: ${baseFontSize};
      line-height: 1.3;
      font-weight: ${baseFontWeight};
    }
    .slip-container {
      width: ${widthMm};
      max-width: ${widthMm};
      margin: 0 auto;
      padding: 1mm 1.5mm 2.5mm 1.5mm;
      height: auto;
      overflow: hidden;
      page-break-after: avoid;
      break-after: avoid;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .divider-solid { border-bottom: 1px solid #000000; margin: 3px 0; }
    .divider-dashed { border-bottom: 1px dashed #666666; margin: 3px 0; }
    .kot-title { font-size: ${headFontSize}; font-weight: 700; text-transform: uppercase; }
    .kot-mode { font-size: 11.5px; font-weight: 700; text-transform: uppercase; margin-top: 1px; }
    .kot-meta { display: flex; justify-content: space-between; font-size: 10.5px; padding: 1.5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 3px 0; }
    th { font-weight: 600; border-bottom: 1px solid #000000; padding: 2px 0; text-align: left; font-size: 10.5px; }
    td { padding: 3px 0; vertical-align: top; border-bottom: 1px dashed #cccccc; }
    .qty-badge { font-size: 13px; font-weight: 700; width: 28px; }
    .item-name { font-size: 12px; font-weight: 600; }
    .item-mod { font-size: 10px; margin-top: 1px; color: #222; }
    .instructions-box { border: 1px dashed #444444; padding: 3px 4px; margin: 4px 0; font-size: 10.5px; }
    .status-text { text-align: center; font-size: 11px; font-weight: 600; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="text-center">
      <div class="kot-title">** KITCHEN TICKET (KOT) **</div>
      <div class="kot-mode">
        ${sale.order_type === 'dine_in' ? `🍽️ DINE-IN · ${sale.table_no || 'TABLE ?'}` : '🛍️ TAKEAWAY / COUNTER'}
      </div>
    </div>

    <div class="divider-solid"></div>

    <div class="kot-meta">
      <span>Order: <b>#${sale.id}</b></span>
      <span>${formattedDate}</span>
    </div>
    <div class="kot-meta">
      <span>Cashier: ${sale.cashier || 'Worker 1'}</span>
      <span>Items: <b>${items.reduce((acc, it) => acc + (it.qty || 1), 0)} pcs</b></span>
    </div>

    <div class="divider-dashed"></div>

    <table>
      <thead>
        <tr>
          <th style="width: 28px;">QTY</th>
          <th>ITEM & INSTRUCTIONS</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td class="qty-badge">x${it.qty}</td>
            <td>
              <div class="item-name">${it.name}</div>
              ${it.modifiers ? `<div class="item-mod">⚠️ ${it.modifiers}</div>` : ''}
              ${it.notes ? `<div class="item-mod">Note: ${it.notes}</div>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${sale.notes ? `
      <div class="instructions-box">
        ORDER NOTE: <b>${sale.notes}</b>
      </div>
    ` : ''}

    <div class="status-text">STATUS: ${sale.status.toUpperCase()}</div>
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------
  // CUSTOMER TAX INVOICE / RECEIPT - NORMAL CLEAN & INK-EFFICIENT
  // -------------------------------------------------------------
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${sale.id}</title>
  <style>
    @page { size: auto; margin: 0mm !important; }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      font-family: ${fontFamily};
      font-size: ${baseFontSize};
      line-height: 1.3;
      font-weight: ${baseFontWeight};
    }
    .slip-container {
      width: ${widthMm};
      max-width: ${widthMm};
      margin: 0 auto;
      padding: 1mm 1.5mm 2.5mm 1.5mm;
      height: auto;
      overflow: hidden;
      page-break-after: avoid;
      break-after: avoid;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .divider-solid { border-bottom: 1px solid #000000; margin: 3px 0; }
    .divider-dashed { border-bottom: 1px dashed #666666; margin: 3px 0; }
    .store-name {
      font-size: ${headFontSize};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .tagline {
      font-size: 9.5px;
      font-weight: 400;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .address {
      font-size: 9.5px;
      font-weight: 400;
      margin-top: 1px;
    }
    .badge {
      display: inline-block;
      border: 1px solid #000000;
      padding: 1px 5px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      margin: 3px auto 1px auto;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      padding: 1px 0;
    }
    table { width: 100%; border-collapse: collapse; margin: 2px 0; }
    th {
      font-weight: 600;
      border-bottom: 1px solid #000000;
      padding: 2px 0;
      font-size: 10.5px;
    }
    td {
      padding: 2.5px 0;
      vertical-align: top;
      border-bottom: 1px dashed #e5e5e5;
    }
    .item-title {
      font-weight: 400;
      font-size: 11.5px;
    }
    .item-sub {
      font-size: 9.5px;
      color: #333333;
      margin-top: 1px;
    }
    .item-qty {
      text-align: center;
      font-weight: 600;
      font-size: 11.5px;
    }
    .item-price {
      text-align: right;
      font-weight: 600;
      font-family: monospace;
      font-size: 11.5px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 1px 0;
    }
    .total-banner {
      display: flex;
      justify-content: space-between;
      font-size: ${totalFontSize};
      font-weight: 700;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 3px 0;
      margin: 3px 0;
    }
    .rewards-box {
      border: 1px dashed #666666;
      padding: 3px 5px;
      margin: 4px 0;
      font-size: 10px;
    }
    .rewards-header {
      text-align: center;
      font-weight: 600;
      font-size: 9.5px;
      border-bottom: 1px dashed #888888;
      padding-bottom: 2px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .footer-text {
      text-align: center;
      font-size: 9.5px;
      margin-top: 4px;
      line-height: 1.35;
    }
    img.logo {
      width: ${logoWidth};
      max-width: ${logoWidth};
      height: auto;
      display: block;
      margin: 0 auto 3px auto;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      filter: contrast(200%) grayscale(100%);
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="text-center">
      ${showLogo ? `<img src="/receipt-logo.png" alt="Logo" class="logo" />` : ''}
      <div class="store-name">${storeName}</div>
      ${tagline ? `<div class="tagline">${tagline}</div>` : ''}
      <div class="address">${address} ${phone ? `· Tel: ${phone}` : ''}</div>
      <div class="badge">${headerNote}</div>
    </div>

    <div class="divider-dashed"></div>

    <div class="meta-row">
      <span>Receipt No:</span>
      <span style="font-family: monospace; font-weight: 600;">${sale.id}</span>
    </div>
    <div class="meta-row">
      <span>Date & Time:</span>
      <span>${formattedDate}</span>
    </div>
    <div class="meta-row">
      <span>Cashier:</span>
      <span>${sale.cashier || 'Cashier 1'}</span>
    </div>
    <div class="meta-row">
      <span>Order Mode:</span>
      <span style="font-weight: 600; text-transform: uppercase;">
        ${sale.order_type} ${sale.table_no ? `(${sale.table_no})` : ''}
      </span>
    </div>
    ${sale.customer_name && sale.customer_name !== 'Walk-in Patron' ? `
      <div class="meta-row" style="font-weight: 600; padding-top: 1px;">
        <span>Patron:</span>
        <span>${sale.customer_name}</span>
      </div>
    ` : ''}

    <div class="divider-solid"></div>

    <table>
      <thead>
        <tr>
          <th style="text-align: left;">ITEM</th>
          <th style="text-align: center; width: 28px;">QTY</th>
          <th style="text-align: right; width: 62px;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td>
              <div class="item-title">${it.name}</div>
              ${it.modifiers ? `<div class="item-sub">* ${it.modifiers}</div>` : ''}
            </td>
            <td class="item-qty">x${it.qty}</td>
            <td class="item-price">${formatShortRupees(it.price * it.qty)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="divider-dashed"></div>

    <div class="summary-row">
      <span>Subtotal:</span>
      <span style="font-family: monospace;">${formatRupees(sale.subtotal)}</span>
    </div>
    ${sale.discount > 0 ? `
      <div class="summary-row" style="font-weight: 600;">
        <span>Discount / Loyalty:</span>
        <span style="font-family: monospace;">-${formatRupees(sale.discount)}</span>
      </div>
    ` : ''}

    <div class="total-banner">
      <span>TOTAL DUE:</span>
      <span style="font-family: monospace;">${formatRupees(sale.total)}</span>
    </div>

    <div class="summary-row">
      <span>Paid via:</span>
      <span style="font-weight: 600; text-transform: uppercase;">${sale.payment}</span>
    </div>
    ${sale.payment === 'Cash' ? `
      <div class="summary-row">
        <span>Cash Tendered:</span>
        <span style="font-family: monospace;">${formatRupees(sale.tendered)}</span>
      </div>
      <div class="summary-row" style="font-weight: 600; font-size: 11.5px; padding-top: 1px;">
        <span>Change Given:</span>
        <span style="font-family: monospace;">${formatRupees(sale.tendered - sale.total)}</span>
      </div>
    ` : ''}

    ${showLoyalty ? `
      <div class="rewards-box">
        <div class="rewards-header">*** SWEET REWARDS (Rs. ${loyaltyRate} = 1 pt) ***</div>
        ${sale.earned > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>Points Earned on this bill:</span>
            <span style="font-family: monospace;">+${sale.earned} pts</span>
          </div>
        ` : `
          <div style="display: flex; justify-content: space-between; font-size: 9px;">
            <span>Points Earned:</span>
            <span>0 pts (Spend Rs. ${loyaltyRate}+ to earn)</span>
          </div>
        `}
        ${sale.redeemed > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Points Redeemed:</span>
            <span style="font-family: monospace;">-${sale.redeemed} pts</span>
          </div>
        ` : ''}
        ${customerPointsBalance !== undefined ? `
          <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px dashed #888888; margin-top: 2px; padding-top: 2px;">
            <span>New Patron Balance:</span>
            <span style="font-family: monospace;">${customerPointsBalance} points</span>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="footer-text">
      ${footer1 ? `<div>${footer1}</div>` : ''}
      ${footer2 ? `<div>${footer2}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Print cleanly via an isolated invisible iframe.
 * Prevents Chrome from including background page height, headers, modals, or creating extra sheets of paper!
 */
export function printReceiptHtml(htmlContent: string, onDone?: () => void) {
  if (typeof window === 'undefined') return;

  let iframe = document.getElementById('pos-print-isolated-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'pos-print-isolated-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    if (onDone) onDone();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Give short delay to ensure any images/fonts in iframe are ready
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print():', e);
      window.print();
    }
    if (onDone) {
      setTimeout(onDone, 200);
    }
  }, 200);
}
