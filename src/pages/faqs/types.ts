export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface FaqFormData {
  category: string;
  question: string;
  answer: string;
  keywords: string; // comma-separated
}
