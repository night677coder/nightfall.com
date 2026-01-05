// Optimized poster loading for data and WiFi connections
class PosterLoader {
  constructor() {
    this.observer = null;
    this.loadedImages = new Set();
    this.networkType = this.getNetworkType();
    this.init();
  }

  // Detect network type
  getNetworkType() {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return connection ? connection.effectiveType : 'unknown';
    }
    return 'unknown';
  }

  // Initialize lazy loading
  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      );
      this.observePosters();
    } else {
      // Fallback for older browsers
      this.loadAllPosters();
    }
  }

  // Observe all poster elements
  observePosters() {
    const posters = document.querySelectorAll('.row__poster, .banner__poster, .detail__poster');
    posters.forEach(poster => {
      if (!this.loadedImages.has(poster.src)) {
        this.observer.observe(poster);
      }
    });
  }

  // Handle intersection observer callback
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadPoster(entry.target);
      }
    });
  }

  // Load individual poster
  loadPoster(poster) {
    const posterSrc = poster.src || poster.dataset.src;
    
    if (!posterSrc || this.loadedImages.has(posterSrc)) {
      return;
    }

    // Add loading state
    poster.classList.add('loading');

    // Create image object to preload
    const img = new Image();
    
    img.onload = () => {
      this.onPosterLoad(poster, img);
    };
    
    img.onerror = () => {
      this.onPosterError(poster);
    };

    // Set appropriate image quality based on network
    const optimizedSrc = this.getOptimizedImageUrl(posterSrc);
    img.src = optimizedSrc;
  }

  // Get optimized image URL based on network conditions
  getOptimizedImageUrl(originalUrl) {
    if (!originalUrl) return originalUrl;

    // TMDB image optimization
    if (originalUrl.includes('image.tmdb.org')) {
      const quality = this.getImageQuality();
      return originalUrl.replace(/\/w\d+\//, `/w${quality}/`);
    }

    // Add cache-busting for better performance
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}v=${Date.now()}`;
  }

  // Get image quality based on network type
  getImageQuality() {
    switch (this.networkType) {
      case 'slow-2g':
      case '2g':
        return '185'; // Low quality for slow connections
      case '3g':
        return '342'; // Medium quality
      case '4g':
      case '5g':
        return '500'; // High quality for fast connections
      default:
        return '342'; // Default medium quality
    }
  }

  // Handle successful poster load
  onPosterLoad(poster, img) {
    poster.src = img.src;
    poster.classList.remove('loading');
    poster.classList.add('loaded');
    this.loadedImages.add(img.src);

    // Stop observing this poster
    if (this.observer) {
      this.observer.unobserve(poster);
    }
  }

  // Handle poster load error
  onPosterError(poster) {
    poster.classList.remove('loading');
    poster.classList.add('error');
    
    // Set fallback image
    poster.src = this.getFallbackImage();
  }

  // Get fallback image for failed loads
  getFallbackImage() {
    // Return a simple SVG or data URL as fallback
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI2MCIgdmlld0JveD0iMCAwIDE4MCAyNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMjYwIiBmaWxsPSIjMWUyOTNiIi8+CjxwYXRoIGQ9Ik03MCA5MEgxMTBWMTIwSDcwVjkwWiIgZmlsbD0iIzRkNTU2NyIvPgo8Y2lyY2xlIGN4PSI5MCIgY3k9IjE0NSIgcj0iMTUiIGZpbGw9IiM0ZDU1NjciLz4KPHN2Zz4K';
  }

  // Load all posters (fallback for older browsers)
  loadAllPosters() {
    const posters = document.querySelectorAll('.row__poster, .banner__poster, .detail__poster');
    posters.forEach(poster => {
      this.loadPoster(poster);
    });
  }

  // Preload critical posters (above fold)
  preloadCriticalPosters() {
    const criticalPosters = document.querySelectorAll('.banner__poster, .detail__poster');
    criticalPosters.forEach(poster => {
      if (poster.src) {
        const img = new Image();
        img.src = this.getOptimizedImageUrl(poster.src);
      }
    });
  }

  // Update network type when connection changes
  setupNetworkListener() {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      connection.addEventListener('change', () => {
        this.networkType = this.getNetworkType();
        console.log('Network type changed to:', this.networkType);
      });
    }
  }

  // Add progressive enhancement
  addProgressiveEnhancement() {
    // Add loading placeholders
    const posters = document.querySelectorAll('.row__poster, .banner__poster, .detail__poster');
    posters.forEach(poster => {
      if (!poster.complete) {
        poster.classList.add('loading');
      }
    });
  }

  // Cleanup observer
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize poster loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.posterLoader = new PosterLoader();
  
  // Setup network listener
  window.posterLoader.setupNetworkListener();
  
  // Preload critical posters
  window.posterLoader.preloadCriticalPosters();
  
  // Add progressive enhancement
  window.posterLoader.addProgressiveEnhancement();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.posterLoader) {
    window.posterLoader.destroy();
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PosterLoader;
}
