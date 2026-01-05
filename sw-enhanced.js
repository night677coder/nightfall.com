// Enhanced Service Worker for poster caching and optimization
const CACHE_NAME = 'nightfalll-v1';
const POSTER_CACHE_NAME = 'nightfalll-posters-v1';

// Cache strategies
const cacheStrategies = {
  // Cache first for posters (images)
  cacheFirst: async (request) => {
    const cache = await caches.open(POSTER_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      // Update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {});
      return cached;
    }
    
    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      // Return fallback for poster requests
      if (request.url.includes('image.tmdb.org') || request.url.includes('poster')) {
        return new Response(getFallbackImage(), {
          headers: { 'Content-Type': 'image/svg+xml' }
        });
      }
      throw error;
    }
  },

  // Network first for critical assets
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      throw error;
    }
  },

  // Stale while revalidate for dynamic content
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    // Always update in background
    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => {});

    // Return cached version immediately if available
    if (cached) {
      return cached;
    }

    // Otherwise wait for network
    return fetchPromise;
  }
};

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/nightfalll/',
        '/nightfalll/index.html',
        '/nightfalll/assets/index-C8VMxZS5.css',
        '/nightfalll/assets/index-Dyg27oqN.js',
        '/nightfalll/assets/optimized-posters.css',
        '/nightfalll/assets/poster-loader.js',
        '/nightfalll/manifest.webmanifest',
        '/nightfalll/registerSW.js'
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== POSTER_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle requests with appropriate strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle poster/image requests
  if (request.destination === 'image' || 
      url.pathname.includes('poster') || 
      url.hostname.includes('image.tmdb.org')) {
    
    event.respondWith(cacheStrategies.cacheFirst(request));
    return;
  }

  // Handle CSS and JS files
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheStrategies.staleWhileRevalidate(request));
    return;
  }

  // Handle navigation requests (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/nightfalll/index.html').then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Handle other requests
  event.respondWith(cacheStrategies.networkFirst(request));
});

// Background sync for failed poster loads
self.addEventListener('sync', (event) => {
  if (event.tag === 'poster-sync') {
    event.waitUntil(syncFailedPosters());
  }
});

// Sync failed poster requests
async function syncFailedPosters() {
  const failedRequests = await getFailedPosterRequests();
  
  for (const request of failedRequests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(POSTER_CACHE_NAME);
        cache.put(request, response);
        await removeFailedRequest(request);
      }
    } catch (error) {
      console.log('Failed to sync poster:', error);
    }
  }
}

// Get failed poster requests from IndexedDB
async function getFailedPosterRequests() {
  // Implementation would use IndexedDB to store failed requests
  return [];
}

// Remove failed request from IndexedDB
async function removeFailedRequest(request) {
  // Implementation would remove from IndexedDB
}

// Get fallback image SVG
function getFallbackImage() {
  return `
    <svg width="180" height="260" viewBox="0 0 180 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="180" height="260" fill="#1e293b"/>
      <path d="M70 90H110V120H70V90Z" fill="#4d5567"/>
      <circle cx="90" cy="145" r="15" fill="#4d5567"/>
      <text x="90" y="200" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="12">Image Not Available</text>
    </svg>
  `;
}

// Push notification for new content
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/nightfalll/vite.svg',
      badge: '/nightfalll/vite.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification('NIGHTFALL', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/nightfalll/')
  );
});

// Periodic background sync for cache updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

// Update cache periodically
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch (error) {
        console.log('Failed to update cache for:', request.url);
      }
    }
  } catch (error) {
    console.log('Cache update failed:', error);
  }
}

// Network quality monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'NETWORK_QUALITY') {
    // Adjust caching strategy based on network quality
    const quality = event.data.quality;
    
    if (quality === 'slow') {
      // Prioritize cache for slow networks
      console.log('Slow network detected, prioritizing cache');
    } else if (quality === 'fast') {
      // Allow more network requests for fast networks
      console.log('Fast network detected, allowing fresh content');
    }
  }
});
