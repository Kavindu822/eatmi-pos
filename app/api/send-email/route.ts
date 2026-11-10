import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { formatRupees } from '@/lib/utils';
import { Sale } from '@/lib/types';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sale, to, customerPointsBalance, action } = body;

    const db = getDatabase();

    // Fetch store and SMTP settings from SQLite
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    const smtpHost = body.smtp_host || settings.smtp_host || 'smtp.gmail.com';
    const smtpPort = Number(body.smtp_port || settings.smtp_port) || 587;
    const smtpUser = body.smtp_user || settings.smtp_user || '';
    const smtpPass = body.smtp_pass || settings.smtp_pass || '';
    const smtpFromName = body.smtp_from_name || settings.smtp_from_name || settings.receipt_store_name || 'EATmi BAKERY & CAFE';
    const smtpSecure = body.smtp_secure !== undefined ? (body.smtp_secure === 'true' || body.smtp_secure === true) : (settings.smtp_secure === 'true' || smtpPort === 465);

    const storeName = settings.receipt_store_name || 'EATmi BAKERY & CAFE';
    const tagline = settings.receipt_tagline || 'ARTISAN PÂTISSERIE & ROASTERY';
    const address = settings.receipt_address || 'No. 07, Eugine Balasuriya Mawatha, Nupe, Matara';
    const phone = settings.receipt_phone || '0740546060';
    const loyaltyRate = Math.max(1, Number(settings.loyalty_rate_rupees) || 300);

    // ACTION: test_smtp (From Owner Portal)
    if (action === 'test_smtp') {
      const testRecipient = String(body.to || smtpUser || '').trim();
      if (!testRecipient) {
        return NextResponse.json({ error: 'Please enter a test recipient email address.' }, { status: 400 });
      }
      if (!smtpUser || !smtpPass) {
        return NextResponse.json({
          error: 'SMTP credentials missing. Please enter your email and password / App Password first.'
        }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.gmail.com',
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.verify();

      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpUser}>`,
        to: testRecipient,
        subject: `Test Email Connection - ${storeName}`,
        text: `Success! Your SMTP connection to ${storeName} is working perfectly.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 16px; background-color: #fafaf9;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #d97706; margin: 0; font-size: 20px; text-transform: uppercase;">${storeName}</h2>
              <p style="color: #78716c; font-size: 12px; margin: 4px 0 0 0;">${tagline}</p>
              <p style="color: #78716c; font-size: 11px; margin: 2px 0 0 0;">${address} · Tel: ${phone}</p>
            </div>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e7e5e4;">
              <h3 style="color: #166534; margin-top: 0; font-size: 16px;">✅ Email Service Connected!</h3>
              <p style="color: #44403c; font-size: 13px; line-height: 1.5;">
                This test confirms that your POS system can now automatically send real-time digital tax invoices and bill receipts directly to your customers' emails.
              </p>
            </div>
            <p style="text-align: center; font-size: 11px; color: #a8a29e; margin-top: 20px;">
              Sent by EATmi POS System · Matara, Sri Lanka
            </p>
          </div>
        `
      });

      return NextResponse.json({ ok: true, message: `Test email successfully sent to ${testRecipient}!` });
    }

    // Standard Sale Receipt Email
    const targetEmail = String(to || '').trim();
    if (!targetEmail) {
      return NextResponse.json({ error: 'Customer email address is required.' }, { status: 400 });
    }

    if (!sale) {
      return NextResponse.json({ error: 'Sale details are required.' }, { status: 400 });
    }

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

    // Generate Plain Text Version
    const plainLines: string[] = [
      '==========================================',
      storeName,
      tagline,
      address,
      `Tel: ${phone}`,
      'TAX INVOICE / RECEIPT',
      '==========================================',
      `Receipt No:  ${sale.id}`,
      `Date & Time: ${formattedDate}`,
      `Order Mode:  ${(sale.order_type || 'takeaway').toUpperCase()}`,
      `Patron:      ${sale.customer_name || 'Walk-in Guest'}`,
      `Cashier:     ${sale.cashier || 'Worker 1'}`,
      '------------------------------------------',
      'ITEMS ORDERED:'
    ];

    items.forEach(it => {
      plainLines.push(`${it.name} x${it.qty} - ${formatRupees(it.price * it.qty)}`);
      if (it.notes) plainLines.push(`  * ${it.notes}`);
    });

    plainLines.push('------------------------------------------');
    plainLines.push(`Subtotal:    ${formatRupees(sale.subtotal)}`);
    if (sale.discount > 0) {
      plainLines.push(`Discount:   -${formatRupees(sale.discount)}`);
    }
    plainLines.push(`TOTAL DUE:   ${formatRupees(sale.total)}`);
    plainLines.push(`Paid via:    ${(sale.payment || 'CASH').toUpperCase()}`);
    if (sale.tendered > 0) {
      plainLines.push(`Cash Paid:   ${formatRupees(sale.tendered)}`);
      plainLines.push(`Change:      ${formatRupees(Math.max(0, sale.tendered - sale.total))}`);
    }

    if (settings.receipt_show_loyalty !== 'false') {
      plainLines.push('------------------------------------------');
      plainLines.push(`*** SWEET REWARDS (Rs. ${loyaltyRate} = 1 pt) ***`);
      if (sale.earned > 0) {
        plainLines.push(`Points Earned on this bill: +${sale.earned} pts`);
      } else {
        plainLines.push(`Points Earned: 0 pts (Spend Rs. ${loyaltyRate}+ to earn)`);
      }
      if (customerPointsBalance !== undefined) {
        plainLines.push(`New Patron Balance: ${customerPointsBalance} points`);
      }
    }

    plainLines.push('==========================================');
    plainLines.push(settings.receipt_footer_1 || '*** THANK YOU FOR VISITING! ***');
    plainLines.push(settings.receipt_footer_2 || 'Fresh bakes served with passion daily.');
    plainLines.push('==========================================');

    const plainText = plainLines.join('\n');
    const subject = `Tax Invoice / Receipt #${sale.id} - ${storeName}`;

    // If SMTP credentials are NOT configured yet
    if (!smtpUser || !smtpPass) {
      return NextResponse.json({
        ok: false,
        notConfigured: true,
        error: 'SMTP email server is not configured in Owner Portal. Set up your Gmail/SMTP credentials to send directly from server.',
        subject,
        plainText
      });
    }

    // Build Premium HTML Email
    const itemRowsHtml = items
      .map(
        it => `
        <tr style="border-bottom: 1px solid #f5f5f4;">
          <td style="padding: 10px 8px; font-size: 13px; color: #1c1917;">
            <strong>${it.name}</strong>
            ${it.notes ? `<div style="font-size: 11px; color: #78716c;">Note: ${it.notes}</div>` : ''}
          </td>
          <td style="padding: 10px 8px; font-size: 13px; color: #44403c; text-align: center; font-weight: bold;">
            x${it.qty}
          </td>
          <td style="padding: 10px 8px; font-size: 13px; color: #1c1917; text-align: right; font-family: monospace; font-weight: 600;">
            ${formatRupees(it.price * it.qty)}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px 10px;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e7e5e4;">
          <!-- Header Banner -->
          <div style="background-color: #1c1917; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; color: #f59e0b;">
              ${storeName}
            </h1>
            <p style="margin: 6px 0 0 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #d6d3d1;">
              ${tagline}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #a8a29e;">
              ${address} · Tel: ${phone}
            </p>
            <div style="margin-top: 12px; display: inline-block; background-color: #292524; color: #f5f5f4; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: bold; letter-spacing: 1px; border: 1px solid #44403c;">
              TAX INVOICE / RECEIPT
            </div>
          </div>

          <!-- Metadata Box -->
          <div style="padding: 16px 20px; background-color: #fafaf9; border-bottom: 1px dashed #d6d3d1; font-size: 12px; color: #44403c;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 3px 0; color: #78716c;">Receipt Number:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: bold; font-family: monospace;">${sale.id}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #78716c;">Date & Time:</td>
                <td style="padding: 3px 0; text-align: right;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #78716c;">Order Mode:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: bold; text-transform: uppercase;">${(sale.order_type || 'takeaway').toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #78716c;">Patron Name:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: bold; color: #1c1917;">${sale.customer_name || 'Valued Guest'}</td>
              </tr>
            </table>
          </div>

          <!-- Items Table -->
          <div style="padding: 16px 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #1c1917; font-size: 11px; color: #78716c; text-transform: uppercase;">
                  <th style="text-align: left; padding: 6px 8px;">Item</th>
                  <th style="text-align: center; padding: 6px 8px;">Qty</th>
                  <th style="text-align: right; padding: 6px 8px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Pricing Totals -->
          <div style="padding: 12px 20px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; border-bottom: 1px solid #e7e5e4;">
            <table style="width: 100%; font-size: 13px; color: #44403c;">
              <tr>
                <td style="padding: 4px 0;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatRupees(sale.subtotal)}</td>
              </tr>
              ${
                sale.discount > 0
                  ? `
                <tr style="color: #dc2626;">
                  <td style="padding: 4px 0;">Discount:</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace;">-${formatRupees(sale.discount)}</td>
                </tr>
              `
                  : ''
              }
              <tr style="font-size: 16px; font-weight: bold; color: #1c1917; border-top: 2px solid #1c1917; border-bottom: 2px solid #1c1917;">
                <td style="padding: 8px 0;">TOTAL DUE:</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #b45309;">${formatRupees(sale.total)}</td>
              </tr>
              <tr style="font-size: 12px;">
                <td style="padding: 6px 0 0 0; color: #78716c;">Paid via:</td>
                <td style="padding: 6px 0 0 0; text-align: right; font-weight: bold; text-transform: uppercase;">${(sale.payment || 'CASH').toUpperCase()}</td>
              </tr>
            </table>
          </div>

          <!-- Sweet Rewards Loyalty Program Box -->
          ${
            settings.receipt_show_loyalty !== 'false'
              ? `
            <div style="margin: 16px 20px; padding: 14px; background-color: #fef3c7; border: 1px dashed #d97706; border-radius: 12px; font-size: 12px;">
              <div style="text-align: center; font-weight: bold; color: #92400e; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                *** SWEET REWARDS (Rs. ${loyaltyRate} = 1 pt) ***
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: #78350f;">
                <span>Points Earned on this Bill:</span>
                <strong style="color: #166534; font-family: monospace; font-size: 13px;">+${sale.earned} pts</strong>
              </div>
              ${
                customerPointsBalance !== undefined
                  ? `
                <div style="display: flex; justify-content: space-between; border-top: 1px dashed #f59e0b; padding-top: 4px; color: #78350f;">
                  <span>New Customer Balance:</span>
                  <strong style="font-family: monospace; font-size: 13px;">${customerPointsBalance} points</strong>
                </div>
              `
                  : ''
              }
            </div>
          `
              : ''
          }

          <!-- Footer -->
          <div style="padding: 20px; text-align: center; font-size: 11px; color: #78716c; background-color: #ffffff;">
            <p style="margin: 0; font-weight: bold; color: #44403c;">
              ${settings.receipt_footer_1 || '*** THANK YOU FOR VISITING! ***'}
            </p>
            <p style="margin: 4px 0 12px 0;">
              ${settings.receipt_footer_2 || 'Fresh bakes served with passion daily.'}
            </p>
            <p style="margin: 0; font-size: 10px; color: #a8a29e;">
              This is an official computer-generated electronic receipt issued by EATmi Bakery & Cafe.<br />
              No. 07, Eugine Balasuriya Mawatha, Nupe, Matara · Tel: 0740546060
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const transporter = nodemailer.createTransport({
      host: smtpHost || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpUser}>`,
      to: targetEmail,
      subject,
      text: plainText,
      html: htmlContent
    });

    return NextResponse.json({
      ok: true,
      message: `Email bill successfully delivered to ${targetEmail}!`
    });
  } catch (error: any) {
    console.error('Send Email Error:', error);
    let errMsg = error?.message || 'Failed to send email bill. Check SMTP configuration.';
    if (errMsg.includes('Invalid login') || errMsg.includes('535') || errMsg.includes('Username and Password not accepted')) {
      errMsg = 'SMTP Authentication failed. For Gmail, you must use a 16-character Google App Password (not your standard password). Enable 2-Step Verification in Google Account -> Security -> App Passwords.';
    } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
      errMsg = 'Could not connect to SMTP server host/port. Please check your internet connection and SMTP host/port.';
    }
    return NextResponse.json({
      ok: false,
      error: errMsg
    }, { status: 500 });
  }
}
