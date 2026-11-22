import { Sale } from './types';
import { formatRupees } from './utils';

/**
 * Builds ESC/POS raw byte buffer for thermal receipt printers (POS-80C / Epson ESC/POS).
 * Formats 80mm rolls with 48 columns per line.
 */
export function buildEscposReceipt({
  sale,
  slipType = 'customer',
  settings = {},
  customerPointsBalance
}: {
  sale: Sale;
  slipType: 'customer' | 'kitchen';
  settings?: Record<string, string>;
  customerPointsBalance?: number;
}): Buffer {
  const chunks: Buffer[] = [];

  const write = (str: string) => {
    chunks.push(Buffer.from(str, 'ascii'));
  };

  const writeBytes = (...bytes: number[]) => {
    chunks.push(Buffer.from(bytes));
  };

  // Commands
  const ESC = 0x1b;
  const GS = 0x1d;

  // 1. Initialize Printer (ESC @)
  writeBytes(ESC, 0x40);

  // 2. Select default code page PC437 (ESC t 0)
  writeBytes(ESC, 0x74, 0x00);

  let items: any[] = [];
  try {
    items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
  } catch {
    items = [];
  }

  const formattedDate = new Date(sale.created || Date.now()).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const divider = '------------------------------------------------\n';
  const doubleDivider = '================================================\n';

  // Helper to format two-column row (e.g. Left + Right) spanning 48 columns
  const format2Col = (left: string, right: string, width = 48) => {
    const spaces = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right + '\n';
  };

  // Helper to format 3-column item row (Name, Qty, Price) spanning 48 columns
  const formatItem = (name: string, qtyStr: string, priceStr: string, width = 48) => {
    const nameMax = width - 18;
    let n = name;
    if (n.length > nameMax) {
      n = n.substring(0, nameMax - 1) + '.';
    }
    const c1 = n.padEnd(nameMax);
    const c2 = qtyStr.padStart(5);
    const c3 = priceStr.padStart(13);
    return c1 + c2 + c3 + '\n';
  };

  if (slipType === 'kitchen') {
    // -------------------------------------------------------------
    // KITCHEN ORDER TICKET (KOT)
    // -------------------------------------------------------------
    // Align Center (ESC a 1)
    writeBytes(ESC, 0x61, 0x01);
    // Double width & double height (GS ! 0x11)
    writeBytes(GS, 0x21, 0x11);
    writeBytes(ESC, 0x45, 0x01); // Bold ON
    write('** KITCHEN TICKET (KOT) **\n');
    writeBytes(GS, 0x21, 0x01); // Double height only
    const modeStr = sale.order_type === 'dine_in'
      ? `DINE-IN · ${sale.table_no || 'TABLE ?'}`
      : 'TAKEAWAY / COUNTER';
    write(`${modeStr}\n`);

    // Reset font & Align Left (ESC a 0)
    writeBytes(GS, 0x21, 0x00);
    writeBytes(ESC, 0x45, 0x00);
    writeBytes(ESC, 0x61, 0x00);

    write(doubleDivider);
    write(format2Col(`Order: #${sale.id}`, formattedDate));
    const totalPcs = items.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0);
    write(`Items: ${totalPcs} pcs\n`);
    write(divider);

    writeBytes(ESC, 0x45, 0x01); // Bold ON
    write(format2Col('QTY  ITEM DESCRIPTION', ''));
    writeBytes(ESC, 0x45, 0x00); // Bold OFF
    write(divider);

    for (const it of items) {
      writeBytes(ESC, 0x45, 0x01); // Bold ON
      writeBytes(GS, 0x21, 0x01); // Double height
      write(`x${it.qty || 1} `);
      writeBytes(GS, 0x21, 0x00); // Normal font
      write(`${it.name}\n`);
      writeBytes(ESC, 0x45, 0x00); // Bold OFF

      if (it.modifiers) {
        write(`     >> Mod: ${it.modifiers}\n`);
      }
      if (it.notes) {
        write(`     >> Note: ${it.notes}\n`);
      }
    }

    write(divider);
    if (sale.notes) {
      writeBytes(ESC, 0x45, 0x01);
      write(`ORDER NOTE: ${sale.notes}\n`);
      writeBytes(ESC, 0x45, 0x00);
      write(divider);
    }

    writeBytes(ESC, 0x61, 0x01); // Center
    write(`STATUS: ${sale.status.toUpperCase()}\n`);

    // Feed 4 lines and Cut
    write('\n\n\n\n');
    writeBytes(GS, 0x56, 0x41, 0x00); // GS V 65 0 (Full Cut)
    return Buffer.concat(chunks);
  }

  // -------------------------------------------------------------
  // CUSTOMER TAX INVOICE / RECEIPT
  // -------------------------------------------------------------
  const storeName = settings.receipt_store_name || 'EATmi';
  const address = settings.receipt_address || 'No. 07, Eugine Balasuriya Mawatha, Nupe, Matara';
  const phone = settings.receipt_phone || '0740546060';
  const headerNote = settings.receipt_header_note || 'TAX INVOICE / RECEIPT';
  const footer1 = settings.receipt_footer_1 || '*** THANK YOU FOR VISITING! ***';
  const footer2 = settings.receipt_footer_2 || 'Fresh bakes served with passion daily.';
  const loyaltyRate = Math.max(1, Number(settings.loyalty_rate_rupees) || 300);
  const showLoyalty = settings.receipt_show_loyalty !== 'false';

  // 1. Kick Cash Drawer pulse on Customer Bill (ESC p 0 25 250)
  writeBytes(ESC, 0x70, 0x00, 0x19, 0xfa);

  // 2. Header (Centered)
  writeBytes(ESC, 0x61, 0x01); // Align Center
  writeBytes(GS, 0x21, 0x11);  // Double size
  writeBytes(ESC, 0x45, 0x01); // Bold ON
  write(`${storeName}\n`);

  writeBytes(GS, 0x21, 0x00);  // Normal font
  writeBytes(ESC, 0x45, 0x00); // Bold OFF
  write(`${address}\n`);
  if (phone) {
    write(`Tel: ${phone}\n`);
  }
  write(`[ ${headerNote} ]\n`);

  // 3. Meta (Align Left)
  writeBytes(ESC, 0x61, 0x00);
  write(divider);
  write(format2Col('Receipt No:', String(sale.id)));
  write(format2Col('Date & Time:', formattedDate));
  write(format2Col('Order Mode:', (sale.order_type || 'takeaway').toUpperCase() + (sale.table_no ? ` (${sale.table_no})` : '')));
  if (sale.customer_name && sale.customer_name !== 'Walk-in Patron' && sale.customer_name !== 'Walk-in Customer') {
    write(format2Col('Customer:', sale.customer_name));
  }

  // 4. Items Table
  write(divider);
  writeBytes(ESC, 0x45, 0x01); // Bold ON
  write(formatItem('ITEM', 'QTY', 'AMOUNT'));
  writeBytes(ESC, 0x45, 0x00); // Bold OFF
  write(divider);

  for (const it of items) {
    const itPrice = (Number(it.price) || 0) * (Number(it.qty) || 1);
    write(formatItem(it.name, `x${it.qty || 1}`, formatRupees(itPrice)));
    if (it.modifiers) {
      write(`  * ${it.modifiers}\n`);
    }
    if (it.notes) {
      write(`  * Note: ${it.notes}\n`);
    }
  }

  // 5. Totals
  write(divider);
  write(format2Col('Subtotal:', formatRupees(sale.subtotal)));
  if (sale.discount > 0) {
    write(format2Col('Discount / Loyalty:', `-${formatRupees(sale.discount)}`));
  }

  write(doubleDivider);
  writeBytes(GS, 0x21, 0x01);  // Double height
  writeBytes(ESC, 0x45, 0x01); // Bold ON
  write(format2Col('TOTAL DUE:', formatRupees(sale.total)));
  writeBytes(GS, 0x21, 0x00);  // Normal font
  writeBytes(ESC, 0x45, 0x00); // Bold OFF
  write(doubleDivider);

  write(format2Col('Paid via:', (sale.payment || 'CASH').toUpperCase()));
  if (sale.payment === 'Cash' && sale.tendered > 0) {
    write(format2Col('Cash Tendered:', formatRupees(sale.tendered)));
    write(format2Col('Change Given:', formatRupees(Math.max(0, sale.tendered - sale.total))));
  }

  // 6. Loyalty Rewards
  if (showLoyalty) {
    write(divider);
    writeBytes(ESC, 0x61, 0x01); // Center
    write(`*** EAT REWARDS (Rs. ${loyaltyRate} = 1 PT) ***\n`);
    writeBytes(ESC, 0x61, 0x00); // Left
    if (sale.earned > 0) {
      write(format2Col('Points Earned on this bill:', `+${sale.earned} pts`));
    }
    if (sale.redeemed > 0) {
      write(format2Col('Points Redeemed:', `-${sale.redeemed} pts`));
    }
    if (customerPointsBalance !== undefined) {
      write(format2Col('New Customer Balance:', `${customerPointsBalance} points`));
    }
  }

  // 7. Footer
  write(divider);
  writeBytes(ESC, 0x61, 0x01); // Center
  if (footer1) write(`${footer1}\n`);
  if (footer2) write(`${footer2}\n`);

  // Feed 4 lines and Cut
  write('\n\n\n\n');
  writeBytes(GS, 0x56, 0x41, 0x00); // GS V 65 0 (Full Cut)

  return Buffer.concat(chunks);
}
