import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Button from '../components/Button';
import { getAppVersion } from '../utils/version';

interface IRecentTasting {
  id: string;
  tasting_date: string;
  rating: number;
  whiskey_name: string;
  whiskey_brand: string;
  whiskey_image_url?: string;
  notes?: string;
  nose?: string;
  palate?: string;
  finish?: string;
  type?: string;
  age?: number;
  abv?: number;
  whiskey_id?: string;
}

interface IRecentPurchase {
  id: string;
  purchase_date: string;
  whiskey_name: string;
  whiskey_brand: string;
  final_price_krw: number;
  whiskey_image_url?: string;
  location?: string;
  store?: string;
}

const MobileHome: React.FC = () => {
  const navigate = useNavigate();
  const [recentTastings, setRecentTastings] = useState<IRecentTasting[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<IRecentPurchase[]>([]);
  const [stats, setStats] = useState({
    totalWhiskeys: 0,
    totalTastings: 0,
    totalPurchases: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(false); // 전체 로딩은 false로 초기화
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTastings, setLoadingTastings] = useState(true);
  const [loadingTodayPicks, setLoadingTodayPicks] = useState(true);
  const [loadingCategoryRanking, setLoadingCategoryRanking] = useState(true);
  const [loadingRecentPurchases, setLoadingRecentPurchases] = useState(true);
  const [currentSliderIndex, setCurrentSliderIndex] = useState(0);
  const [todayPicks, setTodayPicks] = useState<any[]>([]);
  const [categoryRanking, setCategoryRanking] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryRankingMap, setCategoryRankingMap] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    loadDataParallel();
  }, []);

  // 슬라이더 자동 전환
  useEffect(() => {
    if (recentTastings.length > 1) {
      const interval = setInterval(() => {
        setCurrentSliderIndex((prev) => (prev + 1) % recentTastings.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [recentTastings.length]);

  // 병렬 로드 - 각 섹션을 독립적으로 로드
  const loadDataParallel = async () => {
    setLoading(true);
    
    // 모든 섹션을 병렬로 시작
    Promise.all([
      loadTastingsSlider(),
      loadStats(),
      loadTodayPicks(),
      loadCategoryRankingData(),
      loadRecentPurchases()
    ]).finally(() => {
      setLoading(false);
    });
  };

  // 슬라이더 이미지 데이터 로드
  const loadTastingsSlider = async () => {
    try {
      setLoadingTastings(true);
      const sliderCount = Number(localStorage.getItem('home_sliderCount')) || 8;
      
      const { data: tastingData } = await supabase
        .from('tasting_notes')
        .select(`
          id,
          tasting_date,
          rating,
          notes,
          nose,
          palate,
          finish,
          purchases!inner(
            whiskeys!inner(
              id,
              name,
              brand,
              image_url,
              type,
              age,
              abv
            )
          )
        `)
        .order('tasting_date', { ascending: false })
        .limit(sliderCount);

      if (tastingData) {
        const formatted = tastingData.map((item: any) => {
          const purchase = Array.isArray(item.purchases) ? item.purchases[0] : item.purchases;
          const whiskey = Array.isArray(purchase?.whiskeys) ? purchase.whiskeys[0] : purchase?.whiskeys;
          
          return {
            id: item.id,
            tasting_date: item.tasting_date,
            rating: item.rating || 0,
            whiskey_name: whiskey?.name || '',
            whiskey_brand: whiskey?.brand || '',
            whiskey_image_url: whiskey?.image_url,
            notes: item.notes ? item.notes.substring(0, 30) : '',
            nose: item.nose ? item.nose.split(',').slice(0, 2).join(',') : '',
            palate: item.palate ? item.palate.split(',').slice(0, 2).join(',') : '',
            finish: item.finish ? item.finish.split(',').slice(0, 2).join(',') : '',
            type: whiskey?.type || '',
            age: whiskey?.age || 0,
            abv: whiskey?.abv || 0,
            whiskey_id: whiskey?.id || ''
          };
        });
        setRecentTastings(formatted);
      }
    } catch (error) {
      console.error('슬라이더 데이터 로드 오류:', error);
    } finally {
      setLoadingTastings(false);
    }
  };

  // 통계 정보 로드
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const [whiskeysCountResult, tastingsCountResult, purchasesCountResult, ratingsDataResult] = await Promise.all([
        supabase.from('whiskeys').select('id', { count: 'exact', head: true }),
        supabase.from('tasting_notes').select('id', { count: 'exact', head: true }),
        supabase.from('purchases').select('id', { count: 'exact', head: true }),
        supabase.from('tasting_notes').select('rating')
      ]);

      const avgRating = ratingsDataResult.data && ratingsDataResult.data.length > 0
        ? ratingsDataResult.data.reduce((sum, item) => sum + (item.rating || 0), 0) / ratingsDataResult.data.length
        : 0;

      setStats({
        totalWhiskeys: whiskeysCountResult.count || 0,
        totalTastings: tastingsCountResult.count || 0,
        totalPurchases: purchasesCountResult.count || 0,
        avgRating: Math.round(avgRating * 10) / 10
      });
    } catch (error) {
      console.error('통계 데이터 로드 오류:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // 오늘의 Pick 로드
  const loadTodayPicks = async () => {
    try {
      setLoadingTodayPicks(true);
      const todayPickCount = Number(localStorage.getItem('home_todayPickCount')) || 10;

      const { data: whiskeysData } = await supabase
        .from('whiskeys')
        .select(`
          id,
          name,
          brand,
          image_url,
          type,
          age,
          abv,
          price
        `)
        .not('image_url', 'is', null)
        .limit(Math.max(todayPickCount, 10));

      if (whiskeysData && whiskeysData.length > 0) {
        const whiskeyIds = whiskeysData.map((w: any) => w.id);
        
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, whiskey_id')
          .in('whiskey_id', whiskeyIds);

        const purchaseIds = purchasesData?.map((p: any) => p.id).filter(Boolean) || [];
        
        let tastingNotesData: any[] = [];
        if (purchaseIds.length > 0) {
          const { data } = await supabase
            .from('tasting_notes')
            .select('purchase_id, rating, purchases(whiskey_id)')
            .in('purchase_id', purchaseIds);
          
          tastingNotesData = data || [];
        }

        const ratingMap = new Map<string, number[]>();
        
        if (tastingNotesData.length > 0) {
          tastingNotesData.forEach((note: any) => {
            const purchase = Array.isArray(note.purchases) ? note.purchases[0] : note.purchases;
            const whiskey_id = purchase?.whiskey_id;
            if (whiskey_id && note.rating) {
              if (!ratingMap.has(whiskey_id)) {
                ratingMap.set(whiskey_id, []);
              }
              ratingMap.get(whiskey_id)!.push(note.rating);
            }
          });
        }

        const whiskeysWithRatings = whiskeysData.map((whiskey: any) => {
          const ratings = ratingMap.get(whiskey.id) || [];
          const avgRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;
          
          return {
            ...whiskey,
            rating: avgRating
          };
        });

        const sorted = whiskeysWithRatings
          .filter((w: any) => w.image_url)
          .sort((a: any, b: any) => b.rating - a.rating)
          .slice(0, todayPickCount);
        
        setTodayPicks(sorted);
      }
    } catch (error) {
      console.error('오늘의 Pick 로드 오류:', error);
    } finally {
      setLoadingTodayPicks(false);
    }
  };

  // 카테고리 랭킹 로드
  const loadCategoryRankingData = async () => {
    try {
      setLoadingCategoryRanking(true);
      const categoryRankingCount = Number(localStorage.getItem('home_categoryRankingCount')) || 5;

      const { data: categoryData } = await supabase
        .from('whiskeys')
        .select('type')
        .not('type', 'is', null);
      
      if (categoryData) {
        const uniqueTypes = [...new Set(categoryData.map((w: any) => w.type))].filter(Boolean);
        const allCategories = ['전체', ...uniqueTypes];
        setCategories(allCategories);
        
        const { data: whiskeysData } = await supabase
          .from('whiskeys')
          .select(`
            id,
            name,
            brand,
            image_url,
            type,
            age,
            abv,
            price
          `)
          .not('type', 'is', null);

        if (whiskeysData && whiskeysData.length > 0) {
          const whiskeyIds = whiskeysData.map((w: any) => w.id);
          
          const { data: purchasesData } = await supabase
            .from('purchases')
            .select('id, whiskey_id, final_price_krw');

          const purchaseIds = purchasesData?.map((p: any) => p.id).filter(Boolean) || [];
          
          let tastingNotesData: any[] = [];
          if (purchaseIds.length > 0) {
            const { data } = await supabase
              .from('tasting_notes')
              .select('purchase_id, rating, purchases(whiskey_id)')
              .in('purchase_id', purchaseIds);
            
            tastingNotesData = data || [];
          }

          const whiskeyMap = new Map<string, any>();
          
          whiskeysData.forEach((whiskey: any) => {
            if (!whiskey.type) return;
            
            whiskeyMap.set(whiskey.id, {
              ...whiskey,
              rating: 0,
              price_krw: whiskey.price || 0
            });
          });

          if (purchasesData && purchasesData.length > 0) {
            purchasesData.forEach((purchase: any) => {
              const whiskey = whiskeyMap.get(purchase.whiskey_id);
              if (whiskey && purchase.final_price_krw) {
                if (whiskey.price_krw > 0) {
                  whiskey.price_krw = (whiskey.price_krw + purchase.final_price_krw) / 2;
                } else {
                  whiskey.price_krw = purchase.final_price_krw;
                }
              }
            });
          }

          if (tastingNotesData.length > 0) {
            const ratingMap = new Map<string, number[]>();
            
            tastingNotesData.forEach((note: any) => {
              const purchase = Array.isArray(note.purchases) ? note.purchases[0] : note.purchases;
              const whiskey_id = purchase?.whiskey_id;
              if (whiskey_id && note.rating) {
                if (!ratingMap.has(whiskey_id)) {
                  ratingMap.set(whiskey_id, []);
                }
                ratingMap.get(whiskey_id)!.push(note.rating);
              }
            });

            ratingMap.forEach((ratings, whiskey_id) => {
              const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
              const whiskey = whiskeyMap.get(whiskey_id);
              if (whiskey) {
                whiskey.rating = avgRating;
              }
            });
          }

          const typeMap = new Map<string, any[]>();
          whiskeyMap.forEach((whiskey) => {
            if (!whiskey.type) return;
            
            if (!typeMap.has(whiskey.type)) {
              typeMap.set(whiskey.type, []);
            }
            typeMap.get(whiskey.type)!.push(whiskey);
          });

          const rankingMap = new Map<string, any[]>();
          
          for (const category of allCategories) {
            if (category === '전체') {
              const allItems: any[] = [];
              typeMap.forEach((items) => {
                allItems.push(...items);
              });
              const sorted = allItems
                .sort((a: any, b: any) => b.rating - a.rating)
                .slice(0, categoryRankingCount);
              rankingMap.set('전체', sorted);
            } else {
              const items = typeMap.get(category) || [];
              const sorted = items
                .sort((a: any, b: any) => b.rating - a.rating)
                .slice(0, categoryRankingCount);
              rankingMap.set(category, sorted);
            }
          }

          setCategoryRankingMap(rankingMap);
          const initialRanking = rankingMap.get('전체') || [];
          setCategoryRanking(initialRanking);
        }
      }
    } catch (error) {
      console.error('카테고리 랭킹 로드 오류:', error);
    } finally {
      setLoadingCategoryRanking(false);
    }
  };

  // 최근 구매 기록 로드
  const loadRecentPurchases = async () => {
    try {
      setLoadingRecentPurchases(true);
      const recentPurchaseCount = Number(localStorage.getItem('home_recentPurchaseCount')) || 5;

      const { data } = await supabase
        .from('purchases')
        .select(`
          id,
          purchase_date,
          final_price_krw,
          purchase_location,
          store_name,
          whiskeys!inner(
            name,
            brand,
            image_url
          )
        `)
        .order('purchase_date', { ascending: false })
        .limit(recentPurchaseCount);

      if (data) {
        const formatted = data.map((item: any) => {
          const whiskey = Array.isArray(item.whiskeys) ? item.whiskeys[0] : item.whiskeys;
          
          return {
            id: item.id,
            purchase_date: item.purchase_date,
            whiskey_name: whiskey?.name || '',
            whiskey_brand: whiskey?.brand || '',
            final_price_krw: item.final_price_krw || 0,
            whiskey_image_url: whiskey?.image_url,
            location: item.purchase_location || '',
            store: item.store_name || ''
          };
        });
        setRecentPurchases(formatted);
      }
    } catch (error) {
      console.error('최근 구매 기록 로드 오류:', error);
    } finally {
      setLoadingRecentPurchases(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // 설정값 읽기
      const sliderCount = Number(localStorage.getItem('home_sliderCount')) || 8;
      const todayPickCount = Number(localStorage.getItem('home_todayPickCount')) || 10;
      const categoryRankingCount = Number(localStorage.getItem('home_categoryRankingCount')) || 5;
      const recentPurchaseCount = Number(localStorage.getItem('home_recentPurchaseCount')) || 5;

      // 최근 테이스팅 노트
      const { data: tastingData } = await supabase
        .from('tasting_notes')
        .select(`
          id,
          tasting_date,
          rating,
          notes,
          nose,
          palate,
          finish,
          purchases!inner(
            whiskeys!inner(
              id,
              name,
              brand,
              image_url,
              type,
              age,
              abv
            )
          )
        `)
        .order('tasting_date', { ascending: false })
        .limit(sliderCount);

      if (tastingData) {
        const formatted = tastingData.map((item: any) => {
          // purchases는 배열이므로 첫 번째 요소 접근
          const purchase = Array.isArray(item.purchases) ? item.purchases[0] : item.purchases;
          const whiskey = Array.isArray(purchase?.whiskeys) ? purchase.whiskeys[0] : purchase?.whiskeys;
          
          return {
            id: item.id,
            tasting_date: item.tasting_date,
            rating: item.rating || 0,
            whiskey_name: whiskey?.name || '',
            whiskey_brand: whiskey?.brand || '',
            whiskey_image_url: whiskey?.image_url,
            notes: item.notes ? item.notes.substring(0, 30) : '', // notes 일부만
            nose: item.nose ? item.nose.split(',').slice(0, 5).join(',') : '',
            palate: item.palate ? item.palate.split(',').slice(0, 5).join(',') : '',
            finish: item.finish ? item.finish.split(',').slice(0, 5).join(',') : '',
            type: whiskey?.type || '',
            age: whiskey?.age || 0,
            abv: whiskey?.abv || 0,
            whiskey_id: whiskey?.id || ''
          };
        });
        setRecentTastings(formatted);
      }

      // 통계 정보를 한 번에 가져오기 (병렬 처리)
      const [whiskeysCountResult, tastingsCountResult, purchasesCountResult, ratingsDataResult, recentPurchasesResult] = await Promise.all([
        supabase.from('whiskeys').select('id', { count: 'exact', head: true }),
        supabase.from('tasting_notes').select('id', { count: 'exact', head: true }),
        supabase.from('purchases').select('id', { count: 'exact', head: true }),
        supabase.from('tasting_notes').select('rating'),
        supabase
          .from('purchases')
          .select(`
            id,
            purchase_date,
            final_price_krw,
            purchase_location,
            store_name,
            whiskeys!inner(
              name,
              brand,
              image_url
            )
          `)
          .order('purchase_date', { ascending: false })
          .limit(recentPurchaseCount)
      ]);

      // 최근 구매 기록 처리
      if (recentPurchasesResult.data) {
        const formatted = recentPurchasesResult.data.map((item: any) => {
          const whiskey = Array.isArray(item.whiskeys) ? item.whiskeys[0] : item.whiskeys;
          
          return {
            id: item.id,
            purchase_date: item.purchase_date,
            whiskey_name: whiskey?.name || '',
            whiskey_brand: whiskey?.brand || '',
            final_price_krw: item.final_price_krw || 0,
            whiskey_image_url: whiskey?.image_url,
            location: item.purchase_location || '',
            store: item.store_name || ''
          };
        });
        setRecentPurchases(formatted);
      }

      // 통계 정보 처리
      const avgRating = ratingsDataResult.data && ratingsDataResult.data.length > 0
        ? ratingsDataResult.data.reduce((sum, item) => sum + (item.rating || 0), 0) / ratingsDataResult.data.length
        : 0;

      setStats({
        totalWhiskeys: whiskeysCountResult.count || 0,
        totalTastings: tastingsCountResult.count || 0,
        totalPurchases: purchasesCountResult.count || 0,
        avgRating: Math.round(avgRating * 10) / 10
      });

      // 오늘의 Pick - whiskeys 테이블에서 평점 높은 최대 개수만큼
      const { data: whiskeysData } = await supabase
        .from('whiskeys')
        .select(`
          id,
          name,
          brand,
          image_url,
          type,
          age,
          abv,
          price
        `)
        .not('image_url', 'is', null)
        .limit(Math.max(todayPickCount, 10)); // 최소 10개로 조회하여 평점 계산

      if (whiskeysData && whiskeysData.length > 0) {
        // 위스키별 평점 계산을 위해 purchases와 tasting_notes 조회
        const whiskeyIds = whiskeysData.map((w: any) => w.id);
        
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, whiskey_id')
          .in('whiskey_id', whiskeyIds);

        const purchaseIds = purchasesData?.map((p: any) => p.id).filter(Boolean) || [];
        
        let tastingNotesData: any[] = [];
        if (purchaseIds.length > 0) {
          const { data } = await supabase
            .from('tasting_notes')
            .select('purchase_id, rating, purchases(whiskey_id)')
            .in('purchase_id', purchaseIds);
          
          tastingNotesData = data || [];
        }

        // 위스키별 평점 계산
        const ratingMap = new Map<string, number[]>();
        
        if (tastingNotesData.length > 0) {
          tastingNotesData.forEach((note: any) => {
            const purchase = Array.isArray(note.purchases) ? note.purchases[0] : note.purchases;
            const whiskey_id = purchase?.whiskey_id;
            if (whiskey_id && note.rating) {
              if (!ratingMap.has(whiskey_id)) {
                ratingMap.set(whiskey_id, []);
              }
              ratingMap.get(whiskey_id)!.push(note.rating);
            }
          });
        }

        // 평점 정보와 함께 위스키 데이터 구성
        const whiskeysWithRatings = whiskeysData.map((whiskey: any) => {
          const ratings = ratingMap.get(whiskey.id) || [];
          const avgRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;
          
          return {
            ...whiskey,
            rating: avgRating
          };
        });

        // 이미지가 있고 평점이 있는 위스키를 우선 순위로 정렬
        const sorted = whiskeysWithRatings
          .filter((w: any) => w.image_url)
          .sort((a: any, b: any) => b.rating - a.rating)
          .slice(0, todayPickCount);
        
        setTodayPicks(sorted);
      }

      // 카테고리 목록 가져오기
      const { data: categoryData } = await supabase
        .from('whiskeys')
        .select('type')
        .not('type', 'is', null);
      
      if (categoryData) {
        const uniqueTypes = [...new Set(categoryData.map((w: any) => w.type))].filter(Boolean);
        const allCategories = ['전체', ...uniqueTypes];
        setCategories(allCategories);
        
        // 모든 카테고리 데이터 미리 로드
        await loadAllCategoryRankings(allCategories);
      } else {
        loadCategoryRanking('전체');
      }

    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCategoryRankings = async (categoryList: string[]) => {
    try {
      // 카테고리 랭킹 개수 설정값 읽기
      const categoryRankingCount = Number(localStorage.getItem('home_categoryRankingCount')) || 5;
      
      // whiskeys 테이블에서 모든 위스키 가져오기
      const { data: whiskeysData } = await supabase
        .from('whiskeys')
        .select(`
          id,
          name,
          brand,
          image_url,
          type,
          age,
          abv,
          price
        `)
        .not('type', 'is', null);

      if (!whiskeysData || whiskeysData.length === 0) {
        setCategoryRankingMap(new Map());
        setCategoryRanking([]);
        return;
      }

      // 위스키 ID 배열 생성
      const whiskeyIds = whiskeysData.map((w: any) => w.id);
      
      // 위스키별 평점 계산 - purchases와 tasting_notes를 통해
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('id, whiskey_id, final_price_krw, whiskeys(id)')
        .in('whiskey_id', whiskeyIds);

      const purchaseIds = purchasesData?.map((p: any) => p.id).filter(Boolean) || [];
      
      let tastingNotesData: any[] = [];
      if (purchaseIds.length > 0) {
        const { data } = await supabase
          .from('tasting_notes')
          .select('purchase_id, rating, purchases(whiskey_id)')
          .in('purchase_id', purchaseIds);
        
        tastingNotesData = data || [];
      }

      // 위스키별 평점과 가격 계산
      const whiskeyMap = new Map<string, any>();
      
      whiskeysData.forEach((whiskey: any) => {
        if (!whiskey.type) return;
        
        whiskeyMap.set(whiskey.id, {
          ...whiskey,
          rating: 0,
          price_krw: whiskey.price || 0
        });
      });

      // purchases를 통해 가격과 평점 업데이트
      if (purchasesData && purchasesData.length > 0) {
        purchasesData.forEach((purchase: any) => {
          const whiskey = whiskeyMap.get(purchase.whiskey_id);
          if (whiskey && purchase.final_price_krw) {
            // 가격 업데이트 (평균값)
            if (whiskey.price_krw > 0) {
              whiskey.price_krw = (whiskey.price_krw + purchase.final_price_krw) / 2;
            } else {
              whiskey.price_krw = purchase.final_price_krw;
            }
          }
        });
      }

      // tasting_notes를 통해 평점 계산
      if (tastingNotesData.length > 0) {
        const ratingMap = new Map<string, number[]>();
        
        tastingNotesData.forEach((note: any) => {
          const purchase = Array.isArray(note.purchases) ? note.purchases[0] : note.purchases;
          const whiskey_id = purchase?.whiskey_id;
          if (whiskey_id && note.rating) {
            if (!ratingMap.has(whiskey_id)) {
              ratingMap.set(whiskey_id, []);
            }
            ratingMap.get(whiskey_id)!.push(note.rating);
          }
        });

        // 평균 평점 설정
        ratingMap.forEach((ratings, whiskey_id) => {
          const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
          const whiskey = whiskeyMap.get(whiskey_id);
          if (whiskey) {
            whiskey.rating = avgRating;
          }
        });
      }

      // 타입별로 분류
      const typeMap = new Map<string, any[]>();
      whiskeyMap.forEach((whiskey) => {
        if (!whiskey.type) return;
        
        if (!typeMap.has(whiskey.type)) {
          typeMap.set(whiskey.type, []);
        }
        typeMap.get(whiskey.type)!.push(whiskey);
      });

      // 카테고리별 랭킹 생성
      const rankingMap = new Map<string, any[]>();
      
      for (const category of categoryList) {
        if (category === '전체') {
          // 모든 타입 합치기
          const allItems: any[] = [];
          typeMap.forEach((items) => {
            allItems.push(...items);
          });
          const sorted = allItems
            .sort((a: any, b: any) => b.rating - a.rating)
            .slice(0, categoryRankingCount);
          rankingMap.set('전체', sorted);
        } else {
          const items = typeMap.get(category) || [];
          const sorted = items
            .sort((a: any, b: any) => b.rating - a.rating)
            .slice(0, categoryRankingCount);
          rankingMap.set(category, sorted);
        }
      }

      setCategoryRankingMap(rankingMap);
      
      // 초기 카테고리 설정
      const initialRanking = rankingMap.get('전체') || [];
      setCategoryRanking(initialRanking);
      
      console.log('카테고리 랭킹 로드 완료:', {
        전체: initialRanking.length,
        카테고리별: Array.from(rankingMap.entries()).map(([k, v]) => `${k}: ${v.length}`)
      });
    } catch (error) {
      console.error('전체 카테고리 랭킹 로드 오류:', error);
    }
  };

  const loadCategoryRanking = async (category: string) => {
    // 이미 로드된 데이터 사용
    const ranking = categoryRankingMap.get(category) || [];
    setCategoryRanking(ranking);
    
    // 만약 데이터가 없다면 다시 로드
    if (ranking.length === 0 && categories.length > 0) {
      // 전체 재로드
      await loadAllCategoryRankings(categories);
    }
  };

  // 슬라이더 자동 전환
  useEffect(() => {
    if (recentTastings.length > 1) {
      const interval = setInterval(() => {
        setCurrentSliderIndex((prev) => (prev + 1) % recentTastings.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [recentTastings.length]);

  return (
    <div style={{ padding: '0', backgroundColor: '#f9fafb', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Title 이미지와 검색 영역 */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '280px',
        backgroundColor: '#1a1410',
        overflow: 'hidden'
      }}>
        {/* 슬라이드 이미지 */}
        {recentTastings.map((tasting, index) => (
          <div 
            key={`slide-${index}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: index === currentSliderIndex ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
              pointerEvents: 'none'
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              backgroundImage: tasting.whiskey_image_url 
                ? `url(${tasting.whiskey_image_url})`
                : '',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} />
          </div>
        ))}

        {/* 오버레이 그라데이션 - 더 밝게 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))',
          zIndex: 1
        }} />

        {/* 콘텐츠 영역 */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 16px',
          marginBottom: '20px'
        }}>
          {/* 로딩 중 */}
          {loadingTastings && recentTastings.length === 0 ? (
            <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div>⏳ 슬라이더 로딩 중...</div>
            </div>
          ) : null}

          {/* 현재 위스키 정보 */}
          {recentTastings[currentSliderIndex] && !loadingTastings && (
            <div style={{ color: 'white', marginBottom: 'auto' }}>
              <div style={{ 
                fontSize: '22px', 
                fontWeight: 'bold', 
                marginBottom: '6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                WebkitTextStroke: '1px rgba(255,255,255,0.3)'
              }}>
                {recentTastings[currentSliderIndex].whiskey_name}
              </div>
              <div style={{ 
                fontSize: '13px', 
                opacity: 0.9, 
                marginBottom: '4px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                WebkitTextStroke: '0.5px rgba(255,255,255,0.2)'
              }}>
                {recentTastings[currentSliderIndex].whiskey_brand} • ⭐ {recentTastings[currentSliderIndex].rating}/10
              </div>
              
              {/* Nose, Palate, Finish 표시 */}
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {recentTastings[currentSliderIndex].nose && (
                  <div style={{ 
                    fontSize: '12px', 
                    opacity: 0.85,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    WebkitTextStroke: '0.3px rgba(255,255,255,0.2)'
                  }}>👃 {recentTastings[currentSliderIndex].nose}</div>
                )}
                {recentTastings[currentSliderIndex].palate && (
                  <div style={{ 
                    fontSize: '12px', 
                    opacity: 0.85,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)', 
                    WebkitTextStroke: '0.3px rgba(255,255,255,0.2)'
                  }}>👅 {recentTastings[currentSliderIndex].palate}</div>
                )}
                {recentTastings[currentSliderIndex].finish && (
                  <div style={{ 
                    fontSize: '12px', 
                    opacity: 0.85,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    WebkitTextStroke: '0.3px rgba(255,255,255,0.2)'
                  }}>🌊 {recentTastings[currentSliderIndex].finish}</div>
                )}
              </div>
              
              {/* 테이스팅 메모 */}
              {recentTastings[currentSliderIndex].notes && (
                <div style={{ 
                  fontSize: '12px', 
                  opacity: 0.85,
                  marginTop: '80px',
                  marginBottom: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                  WebkitTextStroke: '0.3px rgba(255,255,255,0.2)'
                }}>
                  📝 {recentTastings[currentSliderIndex].notes}
                </div>
              )}
            </div>
          )}

          {/* 하단 오른쪽 이동 버튼 */}
          {recentTastings[currentSliderIndex] && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              right: '16px',
              zIndex: 3
            }}>
              <button
                onClick={() => navigate('/mobile/tasting-notes')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                →
              </button>
            </div>
          )}

          {/* 슬라이더 인디케이터 */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '6px',
            marginTop: 'auto',
            paddingTop: '12px'
          }}>
            {recentTastings.slice(0, Math.min(8, recentTastings.length)).map((_, index) => (
              <div
                key={index}
                style={{
                  width: index === currentSliderIndex ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: index === currentSliderIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setCurrentSliderIndex(index)}
              />
            ))}
          </div>

        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr 1fr', 
        gap: '8px',
        marginTop: '24px',
        marginBottom: '16px',
        padding: '0 16px',
        position: 'relative'
      }}>
        {/* 버전 표시 */}
        <div style={{
          position: 'absolute',
          top: '-22px',
          right: '25px',
          fontSize: '13px',
          color: '#9ca3af',
          zIndex: 1
        }}>
          v{getAppVersion()}
        </div>
        {loadingStats ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} style={{ 
                padding: '12px',
                background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                color: '#9ca3af',
                position: 'relative',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '14px' }}>⏳</div>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card style={{ 
              padding: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              position: 'relative'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>등록된 위스키</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.totalWhiskeys}</div>
              <div style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0.7, fontSize: '28px' }}>🥃</div>
            </Card>
            <Card style={{ 
              padding: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              position: 'relative'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>테이스팅</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.totalTastings}</div>
              <div style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0.7, fontSize: '28px' }}>👅</div>
            </Card>
            <Card style={{ 
              padding: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              position: 'relative'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>구매</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.totalPurchases}</div>
              <div style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0.7, fontSize: '28px' }}>💰</div>
            </Card>
            <Card style={{ 
              padding: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              position: 'relative'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>평점</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.avgRating}</div>
              <div style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0.7, fontSize: '28px' }}>⭐</div>
            </Card>
          </>
        )}
      </div>

      {/* 빠른 액션 */}
      <div style={{ marginBottom: '16px', padding: '0 16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
          더 좋은 위스키핑을 위한
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/mobile/tasting/new')}
            style={{ 
              height: '80px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px'
            }}
          >
            <span style={{ fontSize: '24px' }}>📝</span>
            <span style={{ fontSize: '12px' }}>테이스팅 추가</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/mobile/purchase/form')}
            style={{ 
              height: '80px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px'
            }}
          >
            <span style={{ fontSize: '24px' }}>🛒</span>
            <span style={{ fontSize: '12px' }}>구매 기록</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/mobile/whiskey/new')}
            style={{ 
              height: '80px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px'
            }}
          >
            <span style={{ fontSize: '24px' }}>🥃</span>
            <span style={{ fontSize: '12px' }}>위스키 등록</span>
          </Button>
        </div>
      </div>

      {/* 오늘의 Pick */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ padding: '0 16px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
            오늘의 Pick Whiskey ~ 
          </h3>
        </div>
        <div className="hide-scrollbar" style={{ 
          display: 'flex', 
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '0 16px',
          gap: '12px',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth'
        }}>
          {loadingTodayPicks ? (
            <>
              {[1, 2, 3].map((i) => (
                <Card 
                  key={i}
                  style={{ 
                    minWidth: '140px',
                    maxWidth: '140px',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px' }}>⏳</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px' }}>로딩 중...</div>
                  </div>
                </Card>
              ))}
            </>
          ) : todayPicks.length > 0 ? (
            todayPicks.map((pick, index) => (
              <Card 
                key={pick.id}
                style={{ 
                  minWidth: '140px',
                  maxWidth: '140px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  scrollSnapAlign: 'start'
                }}
                onClick={() => navigate(`/mobile/whiskey/${pick.id}`)}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '100%',
                    height: '120px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    {pick.image_url ? (
                      <img 
                        src={pick.image_url} 
                        alt={pick.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ fontSize: '48px' }}>🥃</div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                    {pick.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px' }}>
                    {pick.brand}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B4513', fontWeight: 600 }}>
                    ⭐ {pick.rating.toFixed(1)}
                  </div>
                </div>
              </Card>
            ))
          ) : null}
        </div>
      </div>

      {/* 카테고리 랭킹 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ padding: '0 16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
            카테고리 랭킹
          </h3>
          
          {/* 카테고리 태그 */}
          <div style={{
            borderTop: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            padding: '8px 0'
          }}>
            <div className="hide-scrollbar" style={{ 
              display: 'flex', 
              overflowX: 'auto',
              overflowY: 'hidden',
              gap: '8px',
              scrollBehavior: 'smooth'
            }}>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    loadCategoryRanking(category);
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: category === selectedCategory ? '2px solid #8B4513' : '1px solid #d1d5db',
                    backgroundColor: category === selectedCategory ? '#8B4513' : 'white',
                    color: category === selectedCategory ? 'white' : '#1f2937',
                    fontSize: '13px',
                    fontWeight: category === selectedCategory ? 600 : 400,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
        {loadingCategoryRanking ? (
          <div style={{ padding: '0 16px' }}>
            <div style={{ 
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: 'white'
            }}>
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>⏳ 카테고리 랭킹 로딩 중...</div>
              </div>
            </div>
          </div>
        ) : categoryRanking.length > 0 ? (
          <div style={{ padding: '0 16px' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              {categoryRanking.map((whiskey, index) => (
                <div 
                  key={whiskey.id}
                  style={{ 
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderBottom: index < categoryRanking.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    animation: 'slideIn 0.4s ease-out forwards',
                    opacity: 0,
                    animationDelay: `${index * 0.05}s`
                  }}
                  onClick={() => navigate(`/mobile/whiskeys/${whiskey.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <div style={{
                  width: '60px',
                  height: '80px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {whiskey.image_url ? (
                    <img 
                      src={whiskey.image_url} 
                      alt={whiskey.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ fontSize: '24px' }}>🥃</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {whiskey.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>
                      {whiskey.brand}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8B4513', fontWeight: 600 }}>
                      ⭐ {whiskey.rating.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#1f2937', 
                    fontWeight: 600,
                    marginLeft: '8px',
                    whiteSpace: 'nowrap'
                  }}>
                    {whiskey.price_krw && whiskey.price_krw > 0 ? `₩${Math.round(whiskey.price_krw).toLocaleString()}` : '₩-'}
                  </div>
                </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>


      {/* 최근 구매 */}
      <div style={{ padding: '0 16px', marginBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
            최근 구매
          </h3>
          {!loadingRecentPurchases && recentPurchases.length > 0 && (
            <button
              onClick={() => navigate('/mobile/purchase')}
              style={{ 
                fontSize: '12px', 
                color: '#8B4513',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              더보기 →
            </button>
          )}
        </div>
        {loadingRecentPurchases ? (
          <div style={{ 
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'white',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>⏳ 최근 구매 기록 로딩 중...</div>
          </div>
        ) : recentPurchases.length > 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {recentPurchases.map((purchase, index) => (
              <div 
                key={purchase.id}
                style={{ 
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: index < recentPurchases.length - 1 ? '1px solid #e5e7eb' : 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => navigate(`/mobile/purchase/${purchase.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                {/* 왼쪽: 이미지 */}
                <div style={{
                  width: '60px',
                  height: '80px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {purchase.whiskey_image_url ? (
                    <img 
                      src={purchase.whiskey_image_url} 
                      alt={purchase.whiskey_name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ fontSize: '24px' }}>🥃</div>
                  )}
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* 첫번째 컬럼 - 유동적 너비 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {purchase.whiskey_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {purchase.whiskey_brand}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {purchase.purchase_date}
                    </div>
                  </div>

                  {/* 두번째 컬럼 - 고정 너비 */}
                  <div style={{ width: '120px', flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#8B4513', fontWeight: 600, marginBottom: '4px' }}>
                      ₩{Math.floor(purchase.final_price_krw).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {purchase.location || '장소 미지정'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {purchase.store || '매장 미지정'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MobileHome;

