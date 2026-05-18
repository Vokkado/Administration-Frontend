import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../../services/api.service';
import type { Faq } from '../types';

function toKeywordsArray(input: string): string[] | null {
  const cleaned = input
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  return cleaned.length > 0 ? cleaned : null;
}

export function useFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination (client-side, since backend doesn't support limit/offset)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Debounce search (400ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Fetch FAQs from server with optional search query
  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : '';
      const response = await apiService.get<any>(`/admin/faqs${params}`);
      const data = response.data || response;
      setFaqs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('No autorizado. Por favor, inicia sesión nuevamente.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al cargar FAQs');
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Re-fetch when debouncedSearch changes
  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Client-side pagination on server-filtered results
  const totalPages = Math.max(1, Math.ceil(faqs.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFaqs = faqs.slice(startIndex, startIndex + itemsPerPage);

  // Compatibility: filteredFaqs exposes the full server-filtered list (used for .length count)
  const filteredFaqs = faqs;

  const createFaq = async (data: { category: string; question: string; answer: string; keywords?: string | null }) => {
    await apiService.post('/admin/faqs', {
      category: data.category,
      question: data.question,
      answer: data.answer,
      keywords: data.keywords ? toKeywordsArray(data.keywords) : null,
    });
    await fetchFaqs();
  };

  const updateFaq = async (id: string, data: { category: string; question: string; answer: string; keywords?: string | null }) => {
    await apiService.put(`/admin/faqs/${id}`, {
      category: data.category,
      question: data.question,
      answer: data.answer,
      keywords: data.keywords ? toKeywordsArray(data.keywords) : null,
    });
    await fetchFaqs();
  };

  const deleteFaq = async (id: string) => {
    try {
      await apiService.delete(`/admin/faqs/${id}`);
      await fetchFaqs();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al eliminar FAQ';
      setError(msg);
      throw err; // Propagar error para que el caller lo maneje
    }
  };

  return {
    faqs,
    filteredFaqs,
    paginatedFaqs,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    setSearchTerm,
    setCurrentPage,
    setError,
    fetchFaqs,
    createFaq,
    updateFaq,
    deleteFaq,
  };
}
