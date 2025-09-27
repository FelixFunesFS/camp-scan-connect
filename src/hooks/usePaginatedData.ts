import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface PaginationState<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
}

export function usePaginatedData<T = any>(options: PaginationOptions = {}) {
  const { pageSize = 50, initialPage = 1 } = options;
  
  const [state, setState] = useState<PaginationState<T>>({
    data: [],
    currentPage: initialPage,
    totalPages: 0,
    totalCount: 0,
    loading: false,
    error: null
  });

  const [filters, setFilters] = useState<Record<string, any>>({});
  const [orderBy, setOrderBy] = useState<{ column: string; ascending: boolean }>({ 
    column: 'created_at', 
    ascending: false 
  });

  const loadData = useCallback(async (
    queryBuilder: () => any,
    countQueryBuilder: () => any,
    page: number = state.currentPage
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Get total count first
      const { count, error: countError } = await countQueryBuilder();
      if (countError) throw countError;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Load paginated data
      const { data, error } = await queryBuilder()
        .range((page - 1) * pageSize, page * pageSize - 1);
        
      if (error) throw error;

      setState({
        data: (data || []) as T[],
        currentPage: page,
        totalPages,
        totalCount,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load data' 
      }));
    }
  }, [pageSize]);

  const setPage = useCallback((queryBuilder: () => any, countQueryBuilder: () => any, page: number) => {
    if (page >= 1 && page <= state.totalPages) {
      loadData(queryBuilder, countQueryBuilder, page);
    }
  }, [loadData, state.totalPages]);

  const refresh = useCallback((queryBuilder: () => any, countQueryBuilder: () => any) => {
    loadData(queryBuilder, countQueryBuilder, state.currentPage);
  }, [loadData, state.currentPage]);

  return {
    ...state,
    setPage,
    refresh,
    loadData,
    hasNextPage: state.currentPage < state.totalPages,
    hasPreviousPage: state.currentPage > 1
  };
}