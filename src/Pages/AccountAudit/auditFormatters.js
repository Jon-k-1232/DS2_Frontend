export const formatCurrency = n => {
   const v = Number(n);
   if (!Number.isFinite(v)) return '$0.00';
   const sign = v < 0 ? '-' : '';
   const abs = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
   return `${sign}$${abs}`;
};

export const fmtDate = iso => {
   if (!iso) return '—';
   try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
   } catch {
      return iso;
   }
};

export const fmtDateTime = iso => {
   if (!iso) return '—';
   try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
   } catch {
      return iso;
   }
};

export const severityColor = sev => {
   if (sev === 'high') return 'error';
   if (sev === 'medium') return 'warning';
   return 'default';
};
