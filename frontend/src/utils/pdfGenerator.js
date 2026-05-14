import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReceiptPDF = (order, brandInfo = { name: 'The Slow Pour', address: '123 Coffee Lane', phone: '+91 9876543210' }) => {
  // Create a new PDF document (receipt format 80mm roll width usually, but let's use A5 or a custom narrow format for digital sharing)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200] // 80mm width, 200mm height
  });

  let y = 10;
  const centerX = 40;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(brandInfo.name, centerX, y, { align: 'center' });
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(brandInfo.address, centerX, y, { align: 'center' });
  
  y += 4;
  doc.text(`Tel: ${brandInfo.phone}`, centerX, y, { align: 'center' });

  y += 6;
  doc.setLineWidth(0.5);
  doc.line(5, y, 75, y); // Separator

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Token: #${order.tokenNumber}`, centerX, y, { align: 'center' });
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const orderDate = new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  doc.text(`Date: ${orderDate}`, 5, y);
  y += 5;
  doc.text(`Type: ${order.orderType}`, 5, y);
  
  y += 4;
  doc.line(5, y, 75, y); // Separator

  // Items Table
  const tableData = order.items.map(item => [
    `${item.quantity}x ${item.name} ${item.size !== 'Regular' ? `(${item.size})` : ''}`,
    `Rs${(item.price * item.quantity).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: y + 2,
    head: [['Item', 'Total']],
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 20, halign: 'right' }
    },
    margin: { left: 5, right: 5 }
  });

  y = doc.lastAutoTable.finalY + 5;
  doc.line(5, y, 75, y); // Separator

  // Totals
  y += 5;
  doc.setFontSize(10);
  doc.text('Subtotal:', 5, y);
  doc.text(`Rs${order.subtotal.toFixed(2)}`, 75, y, { align: 'right' });

  y += 5;
  doc.text('GST (5%):', 5, y);
  doc.text(`Rs${order.gst.toFixed(2)}`, 75, y, { align: 'right' });

  if (order.discountAmount > 0) {
    y += 5;
    doc.text('Discount:', 5, y);
    doc.text(`-Rs${order.discountAmount.toFixed(2)}`, 75, y, { align: 'right' });
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', 5, y);
  doc.text(`Rs${order.total.toFixed(2)}`, 75, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Payment: ${order.paymentMode || 'Pending'}`, 5, y);

  y += 8;
  doc.setFontSize(9);
  doc.text('Thank you for visiting!', centerX, y, { align: 'center' });

  // Save the PDF
  const fileName = `Receipt_Token_${order.tokenNumber}.pdf`;
  doc.save(fileName);
};
