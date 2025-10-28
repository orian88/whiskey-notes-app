// Service Worker for Whiskey Notes App
const CACHE_NAME = 'whiskey-notes-v9';
const STATIC_CACHE_NAME = 'whiskey-notes-static-v9';
const DYNAMIC_CACHE_NAME = 'whiskey-notes-dynamic-v9';

// 정적 자산들 (앱의 핵심 파일들)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/img/icons/icon-72.png',
  '/img/icons/icon-96.png',
  '/img/icons/icon-128.png',
  '/img/icons/icon-144.png',
  '/img/icons/icon-152.png',
  '/img/icons/icon-192.png',
  '/img/icons/icon-384.png',
  '/img/icons/icon-512.png',
  '/img/icons/icon.svg'
];

// 캐시할 파일 확장자들
const CACHEABLE_EXTENSIONS = [
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot'
];

// 네트워크 우선 정책을 사용할 URL 패턴들
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /supabase\.co/,
  /dailyshot\.co/
];

// 캐시 우선 정책을 사용할 URL 패턴들
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
  /\/img\//,
  /\/assets\//
];

// 설치 이벤트 - 정적 자산들을 캐시에 저장
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v9 with mobile optimizations...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets including mobile optimizations');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // 강제로 즉시 활성화
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// 활성화 이벤트 - 이전 캐시들을 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v9 with mobile optimizations...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[SW] Found caches:', cacheNames);
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 모든 이전 캐시 삭제 (강제 갱신)
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('[SW] All old caches deleted, Service Worker v9 activated');
        // 모든 클라이언트에 즉시 적용
        return self.clients.claim();
      })
  );
});

// fetch 이벤트 - 요청을 가로채서 캐싱 전략 적용
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GET 요청만 처리
  if (request.method !== 'GET') {
    return;
  }

  // Chrome extension이나 다른 스키마는 무시
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 네트워크 우선 정책 적용
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 캐시 우선 정책 적용
  if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 기본적으로 stale-while-revalidate 전략 사용
  event.respondWith(staleWhileRevalidate(request));
});

// 네트워크 우선 전략 - API 호출 등에 사용
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // 성공적인 응답이면 캐시에 저장 (백그라운드에서)
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        cache.put(request, responseClone);
      }).catch(err => {
        console.log('[SW] Cache put failed:', err);
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // 네트워크 실패 시 캐시에서 찾기
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 캐시에도 없으면 오프라인 페이지 반환
    return new Response('오프라인 상태입니다. 네트워크 연결을 확인해주세요.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain; charset=utf-8'
      })
    });
  }
}

// 캐시 우선 전략 - 정적 자산에 사용
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        cache.put(request, responseClone);
      }).catch(err => {
        console.log('[SW] Cache put failed:', err);
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch:', request.url);
    
    // 이미지나 정적 자산이 없을 때 기본 이미지 반환
    if (request.url.includes('/img/')) {
      return new Response('', {
        status: 404,
        statusText: 'Not Found'
      });
    }
    
    throw error;
  }
}

// Stale-while-revalidate 전략 - 일반적인 페이지 요청에 사용
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // 백그라운드에서 네트워크 요청 실행
  const networkResponsePromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const responseClone = networkResponse.clone();
        try {
          const cache = await caches.open(DYNAMIC_CACHE_NAME);
          await cache.put(request, responseClone);
        } catch (err) {
          console.log('[SW] Cache put failed:', err);
        }
      }
      return networkResponse;
    })
    .catch(() => {
      // 네트워크 실패 시 무시
    });
  
  // 캐시된 응답이 있으면 즉시 반환, 없으면 네트워크 응답 대기
  return cachedResponse || networkResponsePromise;
}

// 백그라운드 동기화 (선택적)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // 오프라인 상태에서 저장된 데이터를 동기화하는 로직
    console.log('[SW] Performing background sync...');
    
    // IndexedDB에서 오프라인 데이터를 가져와서 서버에 동기화
    // 이 부분은 앱의 데이터 동기화 로직에 따라 구현
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// 푸시 알림 처리 (선택적)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '새로운 알림이 있습니다.',
    icon: '/img/icons/icon-192.png',
    badge: '/img/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '앱 열기',
        icon: '/img/icons/icon-192.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/img/icons/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('위스키 노트 앱', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 메시지 처리 - skipWaiting 요청
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v9 script loaded');
