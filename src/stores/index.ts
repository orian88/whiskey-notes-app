import { create } from 'zustand';
import type { IWhiskey, IPurchase, ITastingNote } from '../types/index';
import { supabase } from '../lib/supabase';

// 위스키 스토어
interface IWhiskeyStore {
  whiskeys: IWhiskey[];
  loading: boolean;
  error: string | null;
  fetchWhiskeys: () => Promise<void>;
  addWhiskey: (whiskey: Omit<IWhiskey, 'id' | 'created_at' | 'updated_at'>) => Promise<IWhiskey | null>;
  updateWhiskey: (id: string, whiskey: Partial<IWhiskey>) => Promise<void>;
  deleteWhiskey: (id: string) => Promise<void>;
}

export const useWhiskeyStore = create<IWhiskeyStore>((set) => ({
  whiskeys: [],
  loading: false,
  error: null,

  fetchWhiskeys: async () => {
    set({ loading: true, error: null });
    try {
      // Supabase에서 위스키 목록 가져오기
      const { data, error } = await import('../lib/supabase').then(m => 
        m.supabase.from('whiskeys').select('*').order('created_at', { ascending: false })
      );
      
      if (error) throw error;
      set({ whiskeys: data || [], loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  addWhiskey: async (whiskey) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('whiskeys').insert(whiskey).select().single()
      );
      
      if (error) throw error;
      set(state => ({ whiskeys: [data, ...state.whiskeys] }));
      return data; // 추가된 위스키 반환
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      throw error; // 오류 재던지기
    }
  },

  updateWhiskey: async (id, whiskey) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('whiskeys').update(whiskey).eq('id', id).select().single()
      );
      
      if (error) throw error;
      set(state => ({
        whiskeys: state.whiskeys.map(w => w.id === id ? data : w)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  deleteWhiskey: async (id) => {
    try {
      const { error } = await import('../lib/supabase').then(m =>
        m.supabase.from('whiskeys').delete().eq('id', id)
      );
      
      if (error) throw error;
      set(state => ({
        whiskeys: state.whiskeys.filter(w => w.id !== id)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
}));

// 구매 정보 스토어
interface IPurchaseStore {
  purchases: IPurchase[];
  loading: boolean;
  error: string | null;
  fetchPurchases: () => Promise<void>;
  addPurchase: (purchase: Omit<IPurchase, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePurchase: (id: string, purchase: Partial<IPurchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
}

export const usePurchaseStore = create<IPurchaseStore>((set) => ({
  purchases: [],
  loading: false,
  error: null,

  fetchPurchases: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('purchases').select('*').order('created_at', { ascending: false })
      );
      
      if (error) throw error;
      set({ purchases: data || [], loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  addPurchase: async (purchase) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('purchases').insert(purchase).select().single()
      );
      
      if (error) throw error;
      set(state => ({ purchases: [data, ...state.purchases] }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  updatePurchase: async (id, purchase) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('purchases').update(purchase).eq('id', id).select().single()
      );
      
      if (error) throw error;
      set(state => ({
        purchases: state.purchases.map(p => p.id === id ? data : p)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  deletePurchase: async (id) => {
    try {
      const { error } = await import('../lib/supabase').then(m =>
        m.supabase.from('purchases').delete().eq('id', id)
      );
      
      if (error) throw error;
      set(state => ({
        purchases: state.purchases.filter(p => p.id !== id)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
}));

// 테이스팅 노트 스토어
interface ITastingNoteStore {
  tastingNotes: ITastingNote[];
  loading: boolean;
  error: string | null;
  fetchTastingNotes: () => Promise<void>;
  addTastingNote: (note: Omit<ITastingNote, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTastingNote: (id: string, note: Partial<ITastingNote>) => Promise<void>;
  deleteTastingNote: (id: string) => Promise<void>;
}

export const useTastingNoteStore = create<ITastingNoteStore>((set) => ({
  tastingNotes: [],
  loading: false,
  error: null,

  fetchTastingNotes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('tasting_notes').select('*').order('created_at', { ascending: false })
      );
      
      if (error) throw error;
      set({ tastingNotes: data || [], loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  addTastingNote: async (note) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('tasting_notes').insert(note).select().single()
      );
      
      if (error) throw error;
      set(state => ({ tastingNotes: [data, ...state.tastingNotes] }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  updateTastingNote: async (id, note) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('tasting_notes').update(note).eq('id', id).select().single()
      );
      
      if (error) throw error;
      set(state => ({
        tastingNotes: state.tastingNotes.map(tn => tn.id === id ? data : tn)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  deleteTastingNote: async (id) => {
    try {
      const { error } = await import('../lib/supabase').then(m =>
        m.supabase.from('tasting_notes').delete().eq('id', id)
      );
      
      if (error) throw error;
      set(state => ({
        tastingNotes: state.tastingNotes.filter(tn => tn.id !== id)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
}));

// 개인 노트 스토어 (임시로 주석 처리)
/*
interface IPersonalNoteStore {
  personalNotes: IPersonalNote[];
  loading: boolean;
  error: string | null;
  fetchPersonalNotes: () => Promise<void>;
  addPersonalNote: (note: Omit<IPersonalNote, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePersonalNote: (id: string, note: Partial<IPersonalNote>) => Promise<void>;
  deletePersonalNote: (id: string) => Promise<void>;
}

export const usePersonalNoteStore = create<IPersonalNoteStore>((set, get) => ({
  personalNotes: [],
  loading: false,
  error: null,

  fetchPersonalNotes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('personal_notes').select('*').order('created_at', { ascending: false })
      );
      
      if (error) throw error;
      set({ personalNotes: data || [], loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  addPersonalNote: async (note) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('personal_notes').insert(note).select().single()
      );
      
      if (error) throw error;
      set(state => ({ personalNotes: [data, ...state.personalNotes] }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  updatePersonalNote: async (id, note) => {
    try {
      const { data, error } = await import('../lib/supabase').then(m =>
        m.supabase.from('personal_notes').update(note).eq('id', id).select().single()
      );
      
      if (error) throw error;
      set(state => ({
        personalNotes: state.personalNotes.map(pn => pn.id === id ? data : pn)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  deletePersonalNote: async (id) => {
    try {
      const { error } = await import('../lib/supabase').then(m =>
        m.supabase.from('personal_notes').delete().eq('id', id)
      );
      
      if (error) throw error;
      set(state => ({
        personalNotes: state.personalNotes.filter(pn => pn.id !== id)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
}));
*/

// UI 상태 스토어 (사이드바 상태 관리)
interface IUIStore {
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<IUIStore>((set, get) => ({
  sidebarExpanded: (() => {
    // localStorage에서 사이드바 상태 불러오기
    try {
      const saved = localStorage.getItem('whiskey-notes-sidebar-expanded');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  })(),

  setSidebarExpanded: (expanded: boolean) => {
    set({ sidebarExpanded: expanded });
    // localStorage에 사이드바 상태 저장
    try {
      localStorage.setItem('whiskey-notes-sidebar-expanded', JSON.stringify(expanded));
    } catch (error) {
      console.warn('사이드바 상태 저장 실패:', error);
    }
  },

  toggleSidebar: () => {
    const currentState = get().sidebarExpanded;
    get().setSidebarExpanded(!currentState);
  },
}));

// 로딩 상태 스토어
interface ILoadingStore {
  isLoading: boolean;
  message: string;
  setLoading: (isLoading: boolean, message?: string) => void;
}

export const useLoadingStore = create<ILoadingStore>((set) => ({
  isLoading: false,
  message: '',
  
  setLoading: (isLoading: boolean, message: string = '로딩 중...') => {
    set({ isLoading, message });
  },
}));

// 인증 스토어
interface IAuthStore {
  user: any | null;
  loading: boolean;
  initialized: boolean;
  checkAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<IAuthStore>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  checkAuth: async () => {
    try {
      set({ loading: true });
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, initialized: true, loading: false });
      
      // 세션 변경 리스너 설정
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null });
      });
    } catch (error) {
      console.error('인증 확인 실패:', error);
      set({ initialized: true, loading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        set({ loading: false });
        return { error: error.message };
      }

      set({ loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: error instanceof Error ? error.message : '로그인 실패' };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  },
}));