export type ReadingStatus = 'want_read' | 'reading' | 'finished';

export interface UserProfile {
  id: string;
  persona_type: string | null;
  persona_name: string | null;
  persona_tags: string[];
  persona_emoji: string | null;
  persona_desc: string | null;
  llm_memory: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  douban_id: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  publish_date: string | null;
  rating: number | null;
  rating_count: number | null;
  cover_url: string | null;
  summary: string | null;
  tags: string[];
  isbn: string | null;
  synced_at: string;
  created_at: string;
}

export interface ReadingHistory {
  id: string;
  user_id: string;
  book_id: string;
  status: ReadingStatus;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface RecommendationCache {
  id: string;
  user_id: string;
  cache_date: string;
  books_json: any;
  created_at: string;
}

export interface DailyTrending {
  id: string;
  trend_date: string;
  topic: string;
  topic_emoji: string | null;
  cultural_analysis: string | null;
  books_json: any;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_json?: any;
  created_at: string;
}

export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  books_synced: number;
  error_message: string | null;
  synced_at: string;
}

export interface Database {
  public: {
    Tables: {
      sync_logs: {
        Row: SyncLog;
        Insert: Partial<SyncLog>;
        Update: Partial<SyncLog>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Partial<UserProfile>;
        Update: Partial<UserProfile>;
      };
      books: {
        Row: Book;
        Insert: Partial<Book>;
        Update: Partial<Book>;
      };
      reading_history: {
        Row: ReadingHistory;
        Insert: Partial<ReadingHistory>;
        Update: Partial<ReadingHistory>;
      };
      recommendation_cache: {
        Row: RecommendationCache;
        Insert: Partial<RecommendationCache>;
        Update: Partial<RecommendationCache>;
      };
      daily_trending: {
        Row: DailyTrending;
        Insert: Partial<DailyTrending>;
        Update: Partial<DailyTrending>;
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
}
