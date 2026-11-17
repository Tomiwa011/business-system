const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
});

// Short form for chart labels, like ₦12.5K
const nairaCompact = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  notation: 'compact',
  maximumFractionDigits: 1,
});

// The API sends money as strings like "7500.00"
export function formatMoney(value) {
  return naira.format(Number(value) || 0);
}

export function formatCompactMoney(value) {
  return nairaCompact.format(Number(value) || 0);
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  });
}