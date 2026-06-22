const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generatePDFInvoice(order) {
    return new Promise((resolve, reject) => {
        try {
            let doc = new PDFDocument({ size: "A4", margin: 50 });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            generateHeader(doc);
            generateCustomerInformation(doc, order);
            generateInvoiceTable(doc, order);
            generateFooter(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

function generateHeader(doc) {
  const logoPath = path.resolve(__dirname, '../../shiprocket-codes/wheelriot.png');
  if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
  }

  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Tax Invoice", 200, 50, { align: "right" })
    .fontSize(10)
    .text("Original for Recipient", 200, 75, { align: "right" })
    .moveDown();
}

function generateCustomerInformation(doc, order) {
  doc.fillColor("#444444").fontSize(15).text("Sold By:", 50, 125);
  generateHr(doc, 145);

  const customerInfoTop = 160;

  doc
    .fontSize(10)
    .text("Wheel Riot", 50, customerInfoTop)
    .text("Order Number:", 300, customerInfoTop)
    .font("Helvetica-Bold")
    .text(`WR-${order._id.toString().substring(0, 10).toUpperCase()}`, 400, customerInfoTop)
    .font("Helvetica")
    .text("Order Date:", 300, customerInfoTop + 15)
    .text(new Date(order.createdAt).toLocaleDateString('en-IN'), 400, customerInfoTop + 15)
    .moveDown();

  doc.fontSize(12).font("Helvetica-Bold").text("Billing Address:", 50, 210);
  
  const billAddr = order.billingAddress || order.shippingAddress;
  
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(billAddr.fullName || "Customer", 50, 225)
    .text(billAddr.street, 50, 240)
    .text(`${billAddr.city}, ${billAddr.state} ${billAddr.zip}`, 50, 255);
}

function generateInvoiceTable(doc, order) {
  let i;
  const invoiceTableTop = 330;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "No",
    "Description",
    "Unit Price",
    "Qty",
    "Total",
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  for (i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      i + 1,
      item.name,
      `Rs ${item.price.toLocaleString()}`,
      item.quantity,
      `Rs ${(item.price * item.quantity).toLocaleString()}`,
    );
    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 35;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "TOTAL:",
    "",
    `Rs ${order.totalAmount.toLocaleString()}`,
  );
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .text("Amount in Words: As per transaction", 50, 700, {
      align: "center",
      width: 500,
    });
  doc
    .fontSize(8)
    .text(
      "This is a computer generated invoice. Therefore, no signature is required.",
      50,
      730,
      { align: "center", width: 500 },
    );
}

function generateTableRow(doc, y, no, desc, price, qty, total) {
  doc
    .fontSize(10)
    .text(no, 50, y)
    .text(desc.substring(0, 35), 100, y, { width: 220 })
    .text(price, 320, y, { width: 90, align: "right" })
    .text(qty, 410, y, { width: 50, align: "right" })
    .text(total, 480, y, { align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

module.exports = { generatePDFInvoice };
