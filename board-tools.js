// The active room is already saved locally after each change by app.js.
const toolBar = document.querySelector('.toolbar');
const pdfButton = document.createElement('button');
pdfButton.className = 'tool';
pdfButton.type = 'button';
pdfButton.innerHTML = '<span>⇩</span><small>PDF</small>';
pdfButton.title = 'Print or save all pages as PDF';
toolBar.append(pdfButton);

const deleteButton = document.createElement('button');
deleteButton.className = 'tool';
deleteButton.type = 'button';
deleteButton.innerHTML = '<span>▣</span><small>Delete local</small>';
deleteButton.title = 'Delete this device’s saved copy';
toolBar.append(deleteButton);

pdfButton.onclick = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { toast('Allow pop-ups to save a PDF.'); return; }
  const pages = Math.max(1, page + 1, ...strokes.map(s => (s.page || 0) + 1));
  const images = [];
  for (let n = 0; n < pages; n++) {
    const sheet = document.createElement('canvas');
    sheet.width = 1600; sheet.height = 1000;
    const c = sheet.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, sheet.width, sheet.height);
    for (const s of strokes) {
      if ((s.page || 0) !== n || !Array.isArray(s.points) || !s.points.length) continue;
      c.save(); c.globalCompositeOperation = s.tool === 'erase' ? 'destination-out' : 'source-over';
      c.strokeStyle = s.color || '#233c2e'; c.lineWidth = s.width * sheet.width;
      c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      c.moveTo(s.points[0][0] * sheet.width, s.points[0][1] * sheet.height);
      if (s.points.length === 1) c.lineTo(s.points[0][0] * sheet.width + .01, s.points[0][1] * sheet.height + .01);
      else for (const pt of s.points.slice(1)) c.lineTo(pt[0] * sheet.width, pt[1] * sheet.height);
      c.stroke(); c.restore();
    }
    images.push(sheet.toDataURL('image/png'));
  }
  const d = printWindow.document;
  d.title = 'Board export';
  const style = d.createElement('style');
  style.textContent = '@page{size:landscape;margin:8mm}body{margin:0;font:12px system-ui}section{break-after:page}section:last-child{break-after:auto}img{display:block;width:100%;max-height:90vh;object-fit:contain}';
  d.head.append(style);
  for (const [i, src] of images.entries()) {
    const section = d.createElement('section'), img = d.createElement('img');
    img.src = src; img.alt = 'Board page ' + (i + 1);
    section.append(img); d.body.append(section);
  }
  Promise.all(Array.from(d.images, img => img.decode().catch(() => {}))).then(() => { printWindow.focus(); printWindow.print(); });
};

deleteButton.onclick = () => {
  if (!confirm('Delete this board’s saved copy from this device? This does not delete copies on other devices.')) return;
  clearTimeout(saveTimer);
  localStorage.removeItem('board-' + room);
  strokes = [];
  current = null;
  render();
  toast('Saved copy deleted on this device');
};
