export const nh = v => Math.round((Number(v) || 0) * 100) / 100;
  export const r2 = v => Math.round(v * 100) / 100;
  export const match = (s, q) => String(s || "").toLowerCase().includes((q || "").toLowerCase());
  export const fmtD = d => d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—";
  export const fmtMoney = v => v != null && v !== "" ? "₡" + Number(v).toLocaleString("es-CR") : "₡0";

  export function fmtDias(d) {
    if (!d && d !== 0) return "—";
    const y = Math.floor(d / 365), r = d - y * 365, m = Math.floor(r / 30), dd = r - m * 30;
    const p = [];
    if (y > 0) p.push(y + "a");
    if (m > 0) p.push(m + "m");
    if (dd > 0 || !p.length) p.push(dd + "d");
    return p.join(" ");
  }

  export function getAnios(p) {
    const res = [];
    if (p.inicio && p.fin) {
      const s = Number(p.inicio.split("-")[0]), e = Number(p.fin.split("-")[0]);
      for (let y = s; y <= e; y++) res.push(y);
    } else {
      res.push(new Date().getFullYear());
    }
    return res;
  }

  export function exportXLSX(titulo, headers, rows) {
    const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const cell = v => { const s = esc(v); const isNum = !isNaN(v) && String(v).trim() !== ''; return isNum ? `<Cell><Data ss:Type="Number">${s}</Data></Cell>` : `<Cell><Data ss:Type="String">${s}</Data></Cell>`; };
    const hRow = '<Row>' + headers.map(h => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('') + '</Row>';
    const dRows = rows.map(r => '<Row>' + r.map(cell).join('') + '</Row>').join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e3a5f" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="${esc(titulo)}"><Table>${hRow}${dRows}</Table></Worksheet></Workbook>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' })); a.download = titulo + '_' + new Date().toISOString().slice(0, 10) + '.xls'; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 300);
  }

  export function exportCSV(titulo, headers, rows) {
    const esc = v => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s }
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = titulo + '_' + new Date().toISOString().slice(0, 10) + '.csv'
    document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href) }, 300)
  }

  export function validarPwd(p) {
    if (!p || p.length < 6) return 'Debe tener al menos 6 caracteres.'
    if (!/[A-Z]/.test(p)) return 'Debe contener al menos una mayúscula.'
    if (!/[a-z]/.test(p)) return 'Debe contener al menos una minúscula.'
    if (!/\d/.test(p)) return 'Debe contener al menos un número.'
    if (!/[!@#$%^&*_\-+=?.,;:]/.test(p)) return 'Debe contener al menos un carácter especial (!@#$%^&*_-+=?).'
    return null
  }

  export function profActivosEnAnio(noms, anio) {
    return new Set(
      noms.filter(n => {
        if (n.estado !== "Activo") return false;
        const ini = Number(n.inicio?.split("-")[0]) || 0;
        const fin = Number(n.fin?.split("-")[0]) || 9999;
        return ini <= anio && fin >= anio;
      }).map(n => n.profesorId)
    );
  }