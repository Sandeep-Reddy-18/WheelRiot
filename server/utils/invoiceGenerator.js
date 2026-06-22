const PDFDocument = require('pdfkit');

const generateInvoice = (order, res = null) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });

            let buffers = [];
            if (res) {
                doc.pipe(res);
            } else {
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
            }

    // Document styling
    const primaryColor = '#DB0000';
    const textColor = '#333333';
    
    // Top Banner
    doc.fillColor(primaryColor)
       .rect(0, 0, 595, 20)
       .fill();

    // Top Header: Company info
    doc.fillColor(primaryColor)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('WHEEL RIOT', 50, 60);

    doc.fillColor('#666666')
       .fontSize(10)
       .font('Helvetica')
       .text('Premium Diecast Models', 50, 85)
       .text('Bandlaguda, Nagole, Hyderabad, Telangana, 500068', 50, 100)
       .text('wheelriot@gmail.com | +91 8978 4422 07 | +91 80192 76207', 50, 115);

    // Top Header: Invoice Text Side
    doc.fillColor(textColor)
       .fontSize(30)
       .font('Helvetica-Bold')
       .text('INVOICE', 50, 60, { align: 'right' });

    doc.fillColor('#666666')
       .fontSize(10)
       .font('Helvetica-Bold').text(`Invoice Number:`, 350, 100)
       .font('Helvetica').text(`INV-${order._id.toString().slice(-6).toUpperCase()}`, 450, 100)
       .font('Helvetica-Bold').text(`Invoice Date:`, 350, 115)
       .font('Helvetica').text(`${new Date(order.createdAt).toLocaleDateString()}`, 450, 115)
       .font('Helvetica-Bold').text(`Payment Method:`, 350, 130)
       .font('Helvetica').text(`${order.payment?.provider || 'Online'}`, 450, 130);

    generateHr(doc, 160);

    // Bill To & Ship To
    doc.fillColor(textColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Billed To:', 50, 180)
       .text('Shipped To:', 300, 180);

    const billing = order.billingAddress || order.shippingAddress;
    const shipping = order.shippingAddress;

    doc.fillColor('#666666')
       .fontSize(10)
       .font('Helvetica')
       // Billing
       .text(billing.fullName || billing.label, 50, 200)
       .text(billing.street, 50, 215)
       .text(`${billing.city}, ${billing.state || ''} ${billing.zip}`, 50, 230)
       .text(`${billing.country}`, 50, 245)
       .text(`Phone: ${billing.phone}`, 50, 260)
       // Shipping
       .text(shipping.fullName || shipping.label, 300, 200)
       .text(shipping.street, 300, 215)
       .text(`${shipping.city}, ${shipping.state || ''} ${shipping.zip}`, 300, 230)
       .text(`${shipping.country}`, 300, 245)
       .text(`Phone: ${shipping.phone}`, 300, 260);

    // Table Header
    const invoiceTableTop = 320;
    doc.font('Helvetica-Bold')
       .fillColor(primaryColor)
       .rect(45, invoiceTableTop - 10, 505, 25)
       .fill();
       
    doc.fillColor('#ffffff');
    generateTableRow(doc, invoiceTableTop - 2, "Item Description", "Unit Cost", "Qty", "Total");
    
    // Table Rows
    doc.fillColor(textColor);
    doc.font('Helvetica');
    let position = invoiceTableTop + 30;
    let subtotal = 0;

    order.items.forEach((item, i) => {
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;
        
        generateTableRow(
            doc,
            position,
            item.name,
            `Rs. ${item.price.toLocaleString()}`,
            item.quantity,
            `Rs. ${lineTotal.toLocaleString()}`
        );
        generateHr(doc, position + 20);
        position += 30;
    });

    // Summary block
    const summaryTop = position + 10;
    doc.font('Helvetica');
    
    // Subtotal
    doc.text('Subtotal:', 350, summaryTop, { width: 90, align: 'right' });
    doc.text(`Rs. ${subtotal.toLocaleString()}`, 450, summaryTop, { width: 90, align: 'right' });
    
    // Shipping
    const shippingCost = order.shipping?.cost || 0;
    doc.text('Shipping:', 350, summaryTop + 20, { width: 90, align: 'right' });
    doc.text(`Rs. ${shippingCost.toLocaleString()}`, 450, summaryTop + 20, { width: 90, align: 'right' });
    
    // Discount
    const discount = order.discountApplied || 0;
    if (discount > 0) {
        doc.fillColor('#10b981'); // Emerald green
        doc.text('Discount:', 350, summaryTop + 40, { width: 90, align: 'right' });
        doc.text(`-Rs. ${discount.toLocaleString()}`, 450, summaryTop + 40, { width: 90, align: 'right' });
    }

    // Grand Total
    doc.fillColor(primaryColor);
    doc.font('Helvetica-Bold');
    doc.fontSize(14);
    const grandTotalTop = summaryTop + (discount > 0 ? 65 : 45);
    doc.text('Grand Total:', 320, grandTotalTop, { width: 120, align: 'right' });
    doc.text(`Rs. ${order.totalAmount.toLocaleString()}`, 450, grandTotalTop, { width: 90, align: 'right' });

    // Footer
    doc.fillColor('#888888')
       .fontSize(10)
       .font('Helvetica-Oblique')
       .text("Thank you for purchasing from Wheel Riot. Keep collecting!", 50, 750, { align: "center", width: 495 });
       
    // Bottom border map
    doc.fillColor(primaryColor)
       .rect(0, 822, 595, 20)
       .fill();

    doc.end();
    if (res) resolve();
    } catch (err) {
        reject(err);
    }
  });
};

function generateTableRow(doc, y, item, unitCost, quantity, lineTotal) {
    doc.text(item, 55, y, { width: 230 }) 
       .text(unitCost, 290, y, { width: 90, align: "right" })
       .text(quantity.toString(), 390, y, { width: 50, align: "center" })
       .text(lineTotal, 450, y, { width: 90, align: "right" });
}

function generateHr(doc, y) {
    doc.strokeColor("#dddddd")
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(545, y)
       .stroke();
}

module.exports = { generateInvoice };
