import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// 데이터베이스 테이블 타입 정의
export interface Database {
  public: {
    Tables: {
      whiskeys: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          type: string | null;
          age: number | null;
          bottle_volume: number | null;
          abv: number | null;
          region: string | null;
          price: number | null;
          distillery: string | null;
          description: string | null;
          cask: string | null;
          image_url: string | null;
          ref_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand?: string | null;
          type?: string | null;
          age?: number | null;
          bottle_volume?: number | null;
          abv?: number | null;
          region?: string | null;
          price?: number | null;
          distillery?: string | null;
          description?: string | null;
          cask?: string | null;
          image_url?: string | null;
          ref_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          brand?: string | null;
          type?: string | null;
          age?: number | null;
          bottle_volume?: number | null;
          abv?: number | null;
          region?: string | null;
          price?: number | null;
          distillery?: string | null;
          description?: string | null;
          cask?: string | null;
          image_url?: string | null;
          ref_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          whiskey_id: string;
          purchase_date: string | null;
          purchase_price: number | null;
          bottle_volume: number | null;
          abv: number | null;
          store_name: string | null;
          store_location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          whiskey_id: string;
          purchase_date?: string | null;
          purchase_price?: number | null;
          bottle_volume?: number | null;
          abv?: number | null;
          store_name?: string | null;
          store_location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          whiskey_id?: string;
          purchase_date?: string | null;
          purchase_price?: number | null;
          bottle_volume?: number | null;
          abv?: number | null;
          store_name?: string | null;
          store_location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasting_notes: {
        Row: {
          id: string;
          whiskey_id: string;
          tasting_date: string | null;
          color: string | null;
          nose: string | null;
          palate: string | null;
          finish: string | null;
          rating: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          whiskey_id: string;
          tasting_date?: string | null;
          color?: string | null;
          nose?: string | null;
          palate?: string | null;
          finish?: string | null;
          rating?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          whiskey_id?: string;
          tasting_date?: string | null;
          color?: string | null;
          nose?: string | null;
          palate?: string | null;
          finish?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      personal_notes: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          category: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content?: string | null;
          category?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string | null;
          category?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
