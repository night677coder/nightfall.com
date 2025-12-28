import React, { useRef } from 'react';
import { SHA256 } from 'crypto-js';
import './Row.css';

function Row({ title, movies, id, showArrows = false, onSelect, onRemove }) {
  const postersRef = useRef();

  const fallbackPoster = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="260" viewBox="0 0 180 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#1f2937"/></linearGradient></defs><rect width="180" height="260" rx="20" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="14">No Image</text></svg>`
  )}`;

  const scrollLeft = () => {
    postersRef.current.scrollBy({ left: -500, behavior: 'smooth' });
  };

  const scrollRight = () => {
    postersRef.current.scrollBy({ left: 500, behavior: 'smooth' });
  };

  const getPosterSrc = (posterPath) => {
    const raw = typeof posterPath === 'string' ? posterPath.trim() : posterPath;
    if (!raw) {
      return fallbackPoster;
    }

    if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('blob:'))) {
      // Some entries use the TMDb website URL; convert it to the image CDN.
      // Example: https://www.themoviedb.org/t/p/w1280/abc.jpg  -> https://image.tmdb.org/t/p/w1280/abc.jpg
      const marker = '/t/p/';
      if ((raw.includes('themoviedb.org') || raw.includes('media.themoviedb.org')) && raw.includes(marker)) {
        const idx = raw.indexOf(marker);
        const path = raw.slice(idx + marker.length);
        return `https://image.tmdb.org/t/p/${path.startsWith('/') ? path.slice(1) : path}`;
      }
      return raw;
    }

    return `https://image.tmdb.org/t/p/w780${raw}`;
  };

  const handlePosterError = (event) => {
    event.target.src = fallbackPoster;
  };

  return (
    <div className="row" id={id}>
      <h2>{title}</h2>
      <div className="row__container">
        {showArrows && (
          <button className="row__arrow row__arrow--left" onClick={scrollLeft}>‹</button>
        )}
        <div className="row__posters" ref={postersRef}>
          {movies.map((movie, index) => (
            <div key={index} className="row__posterContainer">
              <img
                className="row__poster"
                src={getPosterSrc(movie.poster_path)}
                alt={movie.title}
                loading="lazy"
                onError={handlePosterError}
                onClick={() => onSelect && onSelect(movie)}
              />
              {onRemove && (
                <button
                  className="row__remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    const password = window.prompt('Enter admin password to remove movie:').trim();
                    const enteredHash = SHA256(password).toString();
                    if (enteredHash === import.meta.env.VITE_ADMIN_PASSWORD_HASH) {
                      onRemove(movie);
                    } else {
                      alert('Incorrect password. Access denied.');
                    }
                  }}
                  title="Remove from list"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {showArrows && (
          <button className="row__arrow row__arrow--right" onClick={scrollRight}>›</button>
        )}
      </div>
    </div>
  );
}

export default Row;
