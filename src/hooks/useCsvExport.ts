import { useCallback } from 'react';

export const useCsvExport = () => {
  const exportToCsv = useCallback((
    data: Record<string, any>[],
    filename: string = 'export'
  ) => {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from the first object's keys
    const headers = Object.keys(data[0]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes
          const stringValue = value != null ? String(value) : '';
          const escapedValue = stringValue.replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return { exportToCsv };
};