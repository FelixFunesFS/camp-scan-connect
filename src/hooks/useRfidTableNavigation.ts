import { useCallback, useRef } from 'react';

interface UseRfidTableNavigationOptions {
  totalRows: number;
  onRowFocus?: (rowIndex: number) => void;
}

export const useRfidTableNavigation = ({ totalRows, onRowFocus }: UseRfidTableNavigationOptions) => {
  const currentRowRef = useRef<number>(-1);

  const navigateToRow = useCallback((direction: 'up' | 'down', currentRow: number) => {
    let targetRow = currentRow;
    
    if (direction === 'up' && currentRow > 0) {
      targetRow = currentRow - 1;
    } else if (direction === 'down' && currentRow < totalRows - 1) {
      targetRow = currentRow + 1;
    }

    // Find the next code input field
    const targetInput = document.querySelector(`[data-row-index="${targetRow}"] input[data-rfid-input="true"]`) as HTMLInputElement;
    
    if (targetInput) {
      targetInput.focus();
      targetInput.select();
      currentRowRef.current = targetRow;
      onRowFocus?.(targetRow);
    }
  }, [totalRows, onRowFocus]);

  const focusFirstUnassignedRow = useCallback(() => {
    // Find first unassigned row (where input is visible)
    const firstUnassignedInput = document.querySelector('input[data-rfid-input="true"]') as HTMLInputElement;
    if (firstUnassignedInput) {
      firstUnassignedInput.focus();
      const rowIndex = parseInt(firstUnassignedInput.getAttribute('data-row-index') || '0');
      currentRowRef.current = rowIndex;
      onRowFocus?.(rowIndex);
    }
  }, [onRowFocus]);

  return {
    navigateToRow,
    focusFirstUnassignedRow,
    currentRow: currentRowRef.current
  };
};