import React, { useState, useMemo, useEffect } from 'react';
import './App.css';
import Header from './components/Header.jsx';
import Banner from './components/Banner.jsx';
import Row from './components/Row.jsx';
import MovieDetail from './components/MovieDetail.jsx';
import AddMovie from './components/AddMovie.jsx';
import Footer from './components/Footer.jsx';
import AdSense from './components/AdSense.jsx';
import { trending, movies, tvshows, newpopular, mylist, allMovies } from './movieData';
import { getTvDetails, getMovieDetails } from './tmdbService';

const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const dedupeByKey = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item) continue;
    const tmdbId = item.tmdbId != null ? String(item.tmdbId) : '';
    const title = item.title != null ? String(item.title).trim().toLowerCase() : '';
    const type = item.type != null ? String(item.type).trim().toLowerCase() : '';
    if (!tmdbId && !title) continue;
    const key = tmdbId ? `${type}:${tmdbId}` : `${type}:${title}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const STORAGE_KEYS = {
  section: 'nightfall.currentSection',
  selectedMovie: 'nightfall.selectedMovieTitle',
  isDetailView: 'nightfall.isDetailView',
  lastSection: 'nightfall.lastSection'
};

const CACHE_KEYS = {
  vidsrcMovies: 'nightfall.cache.vidsrcMovies',
  vidsrcTvShows: 'nightfall.cache.vidsrcTvShows',
  vidsrcAnime: 'nightfall.cache.vidsrcAnime'
};

const readCache = (key, ttlMs) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const ts = typeof parsed.ts === 'number' ? parsed.ts : 0;
    if (!ts || (Date.now() - ts) > ttlMs) return null;
    return parsed.data;
  } catch (e) {
    return null;
  }
};

const writeCache = (key, data) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    // ignore quota errors
  }
};

function App() {
  const [currentSection, setCurrentSection] = useState(() => {
    if (typeof window === 'undefined') {
      return 'home';
    }
    const storedSection = window.localStorage.getItem(STORAGE_KEYS.section);
    return storedSection || 'home';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const storedMovie = window.localStorage.getItem(STORAGE_KEYS.selectedMovie);
    if (!storedMovie) {
      return null;
    }
    return allMovies.find((movie) => movie.title === storedMovie) || null;
  });
  const [isDetailView, setIsDetailView] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const storedIsDetail = window.localStorage.getItem(STORAGE_KEYS.isDetailView);
    return storedIsDetail === 'true' && !!selectedMovie;
  });
  const [userAddedMovies, setUserAddedMovies] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    const stored = window.localStorage.getItem('nightfall.userAddedMovies');
    return stored ? JSON.parse(stored) : [];
  });
  const [vidsrcMovies, setVidsrcMovies] = useState([]);
  const [vidsrcTvShows, setVidsrcTvShows] = useState([]);
  const [vidsrcAnime, setVidsrcAnime] = useState([]);
  const [tvShowsVisibleCount, setTvShowsVisibleCount] = useState(60);
  const shuffledTrending = useMemo(() => shuffleArray(trending), []);
  const combinedMovies = useMemo(() => [...movies, ...vidsrcMovies], [vidsrcMovies]);
  const shuffledMovies = useMemo(() => shuffleArray(combinedMovies), [combinedMovies]);
  const shuffledNewPopular = useMemo(() => shuffleArray(newpopular), []);
  const combinedTvShows = useMemo(() => [...tvshows, ...vidsrcTvShows], [vidsrcTvShows]);
  const shuffledTvShows = useMemo(() => shuffleArray(combinedTvShows), [combinedTvShows]);
  const pinnedAnime = useMemo(() => {
    const wanted = [
      'bleach',
      'naruto',
      'naruto shippuden',
      'one piece',
      'dragon ball',
      'dragon ball z',
      'dragon ball super',
      'dragon ball gt'
    ];
    const wantedSet = new Set(wanted.map((t) => t.toLowerCase()));

    const matches = [];
    for (const item of vidsrcAnime) {
      const title = String(item?.title || '').trim().toLowerCase();
      if (!title) continue;
      if (wantedSet.has(title)) {
        matches.push(item);
        continue;
      }
      if (wanted.some((needle) => title.includes(needle))) {
        matches.push(item);
      }
    }
    return dedupeByKey(matches);
  }, [vidsrcAnime]);

  const combinedMyList = useMemo(
    () => dedupeByKey([...pinnedAnime, ...mylist, ...userAddedMovies, ...vidsrcAnime]),
    [pinnedAnime, userAddedMovies, vidsrcAnime]
  );
  const combinedCatalog = useMemo(
    () => dedupeByKey([...allMovies, ...userAddedMovies, ...vidsrcMovies, ...vidsrcTvShows, ...vidsrcAnime]),
    [userAddedMovies, vidsrcMovies, vidsrcTvShows, vidsrcAnime]
  );
  const recommendedMovies = selectedMovie
    ? allMovies.filter((movie) => movie.title !== selectedMovie.title)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
    : [];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const controller = new AbortController();

    const cached = readCache(CACHE_KEYS.vidsrcTvShows, 6 * 60 * 60 * 1000);
    if (Array.isArray(cached) && cached.length) {
      setVidsrcTvShows(cached);
    }

    const loadVidsrcTvShows = async () => {
      try {
        const response = await fetch('https://vidsrc.cc/api/list/tv', {
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];

        const fallbackPoster = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="330" viewBox="0 0 220 330"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#1f2937"/></linearGradient></defs><rect width="220" height="330" rx="18" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="14">TV</text></svg>`
        )}`;
        const fallbackBackdrop = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="439" viewBox="0 0 780 439"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#111827"/></linearGradient></defs><rect width="780" height="439" rx="20" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">TV</text></svg>`
        )}`;

        const mapped = list
          .filter((item) => item?.tmdb && item?.title)
          .slice(0, 1500)
          .map((item) => {
            const tmdbId = String(item.tmdb);
            return {
              title: String(item.title),
              poster_path: fallbackPoster,
              description: '',
              releaseDate: '',
              duration: 'N/A',
              rating: 'N/A',
              genre: '',
              director: 'Various',
              quality: 'HD',
              country: '',
              cast: '',
              trailerImage: fallbackBackdrop,
              type: 'tv',
              seasons: 1,
              episodes: 10,
              seasonsEpisodes: [10],
              servers: [
                { name: 'Server 3', url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}` }
              ],
              tmdbId
            };
          });

        setVidsrcTvShows(mapped);
        writeCache(CACHE_KEYS.vidsrcTvShows, mapped);

        const hasTmdbKey = typeof import.meta !== 'undefined'
          && import.meta.env
          && import.meta.env.VITE_TMDB_API_KEY
          && import.meta.env.VITE_TMDB_API_KEY !== 'YOUR_API_KEY_HERE';

        if (!hasTmdbKey) {
          return;
        }

        const wanted = [
          'bleach',
          'naruto',
          'naruto shippuden',
          'one piece',
          'dragon ball',
          'dragon ball z',
          'dragon ball super',
          'dragon ball gt'
        ];

        const shouldEnrich = (item) => {
          const title = String(item?.title || '').trim().toLowerCase();
          if (!title) return false;
          return wanted.some((needle) => title === needle || title.includes(needle));
        };

        const enrichOne = async (show) => {
          try {
            const details = await getTvDetails(show.tmdbId);
            if (!details) return show;

            const imdbId = details.external_ids?.imdb_id || null;
            const posterPath = details.poster_path || null;
            const backdropPath = details.backdrop_path || null;
            const releaseDate = details.first_air_date || '';
            const duration = details.episode_run_time?.length
              ? `${details.episode_run_time[0]}m per episode`
              : show.duration;
            const rating = details.vote_average?.toFixed(1) || show.rating;
            const genre = Array.isArray(details.genres)
              ? details.genres.map((g) => g.name).join(', ')
              : show.genre;
            const seasons = details.number_of_seasons || show.seasons;
            const episodes = details.number_of_episodes || show.episodes;
            const seasonsEpisodes = Array.isArray(details.seasons)
              ? details.seasons
                  .filter((s) => typeof s?.season_number === 'number')
                  .sort((a, b) => a.season_number - b.season_number)
                  .filter((s) => s.season_number > 0)
                  .map((s) => s.episode_count || 0)
              : show.seasonsEpisodes;

            const posterFallback = !posterPath && backdropPath
              ? `https://image.tmdb.org/t/p/w500${backdropPath}`
              : null;

            const servers = (() => {
              const list = [];
              if (imdbId) {
                list.push({
                  name: 'Server 1',
                  url: `https://www.2embed.cc/embedtv/${imdbId}`
                });
                list.push({
                  name: 'Server 2',
                  url: `https://vidsrc-embed.ru/embed/tv/${imdbId}`
                });
                list.push({
                  name: 'Server 3',
                  url: `https://vidsrc.cc/v2/embed/tv/${imdbId}`
                });
                return list;
              }

              // Fallback: vidsrc supports TMDb numeric IDs, so keep Server 3 at least.
              list.push({
                name: 'Server 3',
                url: `https://vidsrc.cc/v2/embed/tv/${show.tmdbId}`
              });
              return list;
            })();

            return {
              ...show,
              title: details.name || show.title,
              description: details.overview || show.description,
              releaseDate,
              duration,
              rating,
              genre,
              poster_path: posterPath || posterFallback || show.poster_path,
              trailerImage: backdropPath ? `https://image.tmdb.org/t/p/w780${backdropPath}` : show.trailerImage,
              seasons,
              episodes,
              seasonsEpisodes: seasonsEpisodes?.length ? seasonsEpisodes : show.seasonsEpisodes,
              servers
            };
          } catch (e) {
            return show;
          }
        };

        const batchSize = 30;
        for (let offset = 0; offset < mapped.length; offset += batchSize) {
          if (controller.signal.aborted) {
            return;
          }

          const batch = mapped.slice(offset, offset + batchSize);
          const enriched = await Promise.all(batch.map(enrichOne));

          setVidsrcTvShows((prev) => {
            const byTmdbId = new Map(enriched.map((item) => [String(item.tmdbId), item]));
            return prev.map((item) => byTmdbId.get(String(item.tmdbId)) || item);
          });

          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch (e) {
        // ignore network/CORS/abort errors
      }
    };

    loadVidsrcTvShows();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const controller = new AbortController();

    const loadVidsrcAnime = async () => {
      try {
        const response = await fetch('https://vidsrc.cc/api/list/anime', {
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];

        const fallbackPoster = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="330" viewBox="0 0 220 330"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#1f2937"/></linearGradient></defs><rect width="220" height="330" rx="18" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="14">ANIME</text></svg>`
        )}`;
        const fallbackBackdrop = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="439" viewBox="0 0 780 439"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#111827"/></linearGradient></defs><rect width="780" height="439" rx="20" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">ANIME</text></svg>`
        )}`;

        const mapped = list
          .filter((item) => item?.tmdb && item?.title)
          .slice(0, 1500)
          .map((item) => {
            const tmdbId = String(item.tmdb);

            const rawPoster = item?.poster || item?.poster_path || item?.posterUrl || item?.poster_url || item?.image || item?.img || '';
            const rawBackdrop = item?.backdrop || item?.backdrop_path || item?.backdropUrl || item?.backdrop_url || item?.cover || item?.coverUrl || '';
            const posterFromPayload = typeof rawPoster === 'string' && rawPoster.trim().startsWith('http') ? rawPoster.trim() : null;
            const backdropFromPayload = typeof rawBackdrop === 'string' && rawBackdrop.trim().startsWith('http') ? rawBackdrop.trim() : null;

            return {
              title: String(item.title),
              poster_path: posterFromPayload || fallbackPoster,
              description: '',
              releaseDate: '',
              duration: 'N/A',
              rating: 'N/A',
              genre: 'Anime',
              director: 'Various',
              quality: 'HD',
              country: '',
              cast: '',
              trailerImage: backdropFromPayload || fallbackBackdrop,
              type: 'tv',
              seasons: 1,
              episodes: 10,
              seasonsEpisodes: [10],
              servers: [
                { name: 'Server 1', url: `https://www.2embed.cc/embedtv/${tmdbId}` },
                { name: 'Server 2', url: `https://vidsrc-embed.ru/embed/tv/${tmdbId}` },
                { name: 'Server 3', url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}` }
              ],
              tmdbId
            };
          });

        setVidsrcAnime(mapped);
        writeCache(CACHE_KEYS.vidsrcAnime, mapped);

        const hasTmdbKey = typeof import.meta !== 'undefined'
          && import.meta.env
          && import.meta.env.VITE_TMDB_API_KEY
          && import.meta.env.VITE_TMDB_API_KEY !== 'YOUR_API_KEY_HERE';

        if (!hasTmdbKey) {
          return;
        }

        const wanted = [
          'bleach',
          'naruto',
          'naruto shippuden',
          'one piece',
          'dragon ball',
          'dragonball',
          'dragon ball z',
          'dragonball z',
          'dragon ball super',
          'dragon ball gt'
        ];

        const shouldEnrich = (item) => {
          const title = String(item?.title || '').trim().toLowerCase();
          if (!title) return false;
          return wanted.some((needle) => title === needle || title.includes(needle));
        };

        const enrichOne = async (show) => {
          try {
            const tvDetails = await getTvDetails(show.tmdbId);
            const movieDetails = tvDetails ? null : await getMovieDetails(show.tmdbId);
            const details = tvDetails || movieDetails;
            if (!details) return show;

            const isMovie = !!movieDetails;
            const resolvedType = isMovie ? 'movie' : 'tv';
            const imdbId = details.external_ids?.imdb_id || null;
            const posterPath = details.poster_path || null;
            const backdropPath = details.backdrop_path || null;
            const description = details.overview || show.description;
            const releaseDate = isMovie ? (details.release_date || '') : (details.first_air_date || '');
            const duration = isMovie
              ? (typeof details.runtime === 'number' ? `${details.runtime}m` : show.duration)
              : (details.episode_run_time?.length ? `${details.episode_run_time[0]}m per episode` : show.duration);
            const rating = details.vote_average?.toFixed(1) || show.rating;
            const genre = Array.isArray(details.genres)
              ? details.genres.map((g) => g.name).join(', ')
              : show.genre;

            const posterFallback = !posterPath && backdropPath
              ? `https://image.tmdb.org/t/p/w500${backdropPath}`
              : null;

            const servers = (() => {
              const embedId = imdbId || show.tmdbId;
              if (resolvedType === 'movie') {
                return [
                  { name: 'Server 1', url: `https://www.2embed.cc/embed/${embedId}` },
                  { name: 'Server 2', url: `https://vidsrc-embed.ru/embed/movie/${embedId}` },
                  { name: 'Server 3', url: `https://vidsrc.cc/v2/embed/movie/${embedId}` }
                ];
              }
              return [
                { name: 'Server 1', url: `https://www.2embed.cc/embedtv/${embedId}` },
                { name: 'Server 2', url: `https://vidsrc-embed.ru/embed/tv/${embedId}` },
                { name: 'Server 3', url: `https://vidsrc.cc/v2/embed/tv/${embedId}` }
              ];
            })();

            const seasons = !isMovie ? (details.number_of_seasons || show.seasons) : show.seasons;
            const episodes = !isMovie ? (details.number_of_episodes || show.episodes) : show.episodes;
            const seasonsEpisodes = !isMovie && Array.isArray(details.seasons)
              ? details.seasons
                  .filter((s) => typeof s?.season_number === 'number')
                  .sort((a, b) => a.season_number - b.season_number)
                  .filter((s) => s.season_number > 0)
                  .map((s) => s.episode_count || 0)
              : show.seasonsEpisodes;

            return {
              ...show,
              type: resolvedType,
              title: (isMovie ? details.title : details.name) || show.title,
              description,
              releaseDate,
              duration,
              rating,
              genre: genre || show.genre,
              poster_path: posterPath || posterFallback || show.poster_path,
              trailerImage: backdropPath ? `https://image.tmdb.org/t/p/w780${backdropPath}` : show.trailerImage,
              seasons,
              episodes,
              seasonsEpisodes: seasonsEpisodes?.length ? seasonsEpisodes : show.seasonsEpisodes,
              servers
            };
          } catch (e) {
            return show;
          }
        };

        const highPriority = dedupeByKey([...mapped.filter(shouldEnrich), ...mapped.slice(0, 250)]);
        const lowPriority = mapped.slice(250);

        const runBatches = async (candidates, delayMs) => {
          const batchSize = 25;
          for (let offset = 0; offset < candidates.length; offset += batchSize) {
            if (controller.signal.aborted) {
              return;
            }

            const batch = candidates.slice(offset, offset + batchSize);
            const enriched = await Promise.all(batch.map(enrichOne));

            setVidsrcAnime((prev) => {
              const byTmdbId = new Map(enriched.map((item) => [String(item.tmdbId), item]));
              const next = prev.map((item) => byTmdbId.get(String(item.tmdbId)) || item);
              writeCache(CACHE_KEYS.vidsrcAnime, next);
              return next;
            });

            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        };

        await runBatches(highPriority, 250);

        const scheduleLowPriority = () => {
          if (controller.signal.aborted) {
            return;
          }
          runBatches(lowPriority, 450);
        };

        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(scheduleLowPriority, { timeout: 3000 });
        } else {
          setTimeout(scheduleLowPriority, 1000);
        }
      } catch (e) {
        // ignore network/CORS/abort errors
      }
    };

    loadVidsrcAnime();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const controller = new AbortController();

    const cached = readCache(CACHE_KEYS.vidsrcMovies, 6 * 60 * 60 * 1000);
    if (Array.isArray(cached) && cached.length) {
      setVidsrcMovies(cached);
    }

    const loadVidsrcMovies = async () => {
      try {
        const response = await fetch('https://vidsrc.cc/api/list/movie', {
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];

        const fallbackPoster = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="330" viewBox="0 0 220 330"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#1f2937"/></linearGradient></defs><rect width="220" height="330" rx="18" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="14">MOVIE</text></svg>`
        )}`;
        const fallbackBackdrop = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="439" viewBox="0 0 780 439"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#111827"/></linearGradient></defs><rect width="780" height="439" rx="20" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">MOVIE</text></svg>`
        )}`;

        const mapped = list
          .filter((item) => item?.tmdb && item?.title)
          .slice(0, 240)
          .map((item) => {
            const tmdbId = String(item.tmdb);
            return {
              title: String(item.title),
              poster_path: fallbackPoster,
              description: '',
              releaseDate: '',
              duration: 'N/A',
              rating: 'N/A',
              genre: '',
              director: 'Various',
              quality: 'HD',
              country: '',
              cast: '',
              trailerImage: fallbackBackdrop,
              type: 'movie',
              servers: [
                { name: 'Server 3', url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}` }
              ],
              tmdbId
            };
          });

        setVidsrcMovies(mapped);
        writeCache(CACHE_KEYS.vidsrcMovies, mapped);

        const hasTmdbKey = typeof import.meta !== 'undefined'
          && import.meta.env
          && import.meta.env.VITE_TMDB_API_KEY
          && import.meta.env.VITE_TMDB_API_KEY !== 'YOUR_API_KEY_HERE';

        if (!hasTmdbKey) {
          return;
        }

        const enrichOne = async (movie) => {
          try {
            const details = await getMovieDetails(movie.tmdbId);
            if (!details) return movie;

            const imdbId = details.external_ids?.imdb_id || null;
            const posterPath = details.poster_path || null;
            const backdropPath = details.backdrop_path || null;
            const releaseDate = details.release_date || '';
            const duration = typeof details.runtime === 'number' ? `${details.runtime}m` : movie.duration;
            const rating = details.vote_average?.toFixed(1) || movie.rating;
            const genre = Array.isArray(details.genres)
              ? details.genres.map((g) => g.name).join(', ')
              : movie.genre;

            const posterFallback = !posterPath && backdropPath
              ? `https://image.tmdb.org/t/p/w500${backdropPath}`
              : null;

            const servers = (() => {
              const list = [];
              if (imdbId) {
                list.push({ name: 'Server 1', url: `https://www.2embed.cc/embed/${imdbId}` });
                list.push({ name: 'Server 2', url: `https://vidsrc-embed.ru/embed/movie/${imdbId}` });
                list.push({ name: 'Server 3', url: `https://vidsrc.cc/v2/embed/movie/${imdbId}` });
                return list;
              }

              // Fallback: vidsrc supports TMDb numeric IDs, so keep Server 3 at least.
              list.push({ name: 'Server 3', url: `https://vidsrc.cc/v2/embed/movie/${movie.tmdbId}` });
              return list;
            })();

            return {
              ...movie,
              title: details.title || movie.title,
              description: details.overview || movie.description,
              releaseDate,
              duration,
              rating,
              genre,
              poster_path: posterPath || posterFallback || movie.poster_path,
              trailerImage: backdropPath ? `https://image.tmdb.org/t/p/w780${backdropPath}` : movie.trailerImage,
              servers
            };
          } catch (e) {
            return movie;
          }
        };

        const batchSize = 30;
        for (let offset = 0; offset < mapped.length; offset += batchSize) {
          if (controller.signal.aborted) {
            return;
          }

          const batch = mapped.slice(offset, offset + batchSize);
          const enriched = await Promise.all(batch.map(enrichOne));

          setVidsrcMovies((prev) => {
            const byTmdbId = new Map(enriched.map((item) => [String(item.tmdbId), item]));
            const next = prev.map((item) => byTmdbId.get(String(item.tmdbId)) || item);
            writeCache(CACHE_KEYS.vidsrcMovies, next);
            return next;
          });

          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch (e) {
        // ignore network/CORS/abort errors
      }
    };

    loadVidsrcMovies();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.section, currentSection);
  }, [currentSection]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (selectedMovie) {
      window.localStorage.setItem(STORAGE_KEYS.selectedMovie, selectedMovie.title);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.selectedMovie);
    }
  }, [selectedMovie]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.isDetailView, isDetailView.toString());
  }, [isDetailView]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('nightfall.userAddedMovies', JSON.stringify(userAddedMovies));
  }, [userAddedMovies]);

  const handleNavClick = (section) => {
    setSearchTerm('');
    setSelectedMovie(null);
    setIsDetailView(false);
    if (section === 'tvshows') {
      setTvShowsVisibleCount(60);
    }
    setCurrentSection(section);
  };

  const handleAddMovie = (movie) => {
    setUserAddedMovies(prev => [...prev, movie]);
  };

  const handleSelectMovie = (movie) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.lastSection, currentSection);
    }
    const fullMovie = combinedCatalog.find((item) => {
      const a = item?.tmdbId != null ? String(item.tmdbId) : '';
      const b = movie?.tmdbId != null ? String(movie.tmdbId) : '';
      if (a && b) return a === b;
      return item?.title === movie?.title;
    }) || movie;
    setSelectedMovie(fullMovie);
    setIsDetailView(true);
    setSearchTerm('');
  };

  const handleRemoveMovie = (movie) => {
    setUserAddedMovies((prev) => prev.filter((item) => {
      const a = item?.tmdbId != null ? String(item.tmdbId) : '';
      const b = movie?.tmdbId != null ? String(movie.tmdbId) : '';
      if (a && b) return a !== b;
      return item?.title !== movie?.title;
    }));
  };

  const handleBackToBrowse = () => {
    setSelectedMovie(null);
    setIsDetailView(false);
    const lastSection = typeof window !== 'undefined'
      ? (window.localStorage.getItem(STORAGE_KEYS.lastSection) || 'home')
      : 'home';
    setCurrentSection(lastSection);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? combinedCatalog.filter((movie) =>
        String(movie?.title || '').toLowerCase().includes(normalizedSearch)
      )
    : [];

  const renderSearchResults = () => {
    if (!searchResults.length) {
      return (
        <div className="search-empty">
          No results found for "{searchTerm}".
        </div>
      );
    }

    return (
      <Row
        id="search"
        title={`Search Results for "${searchTerm}"`}
        movies={searchResults}
        showArrows={searchResults.length > 5}
        onSelect={handleSelectMovie}
      />
    );
  };

  const renderContent = () => {
    if (isDetailView && selectedMovie) {
      return (
        <MovieDetail
          movie={selectedMovie}
          recommended={recommendedMovies}
          onSelect={handleSelectMovie}
          onBack={handleBackToBrowse}
        />
      );
    }

    switch (currentSection) {
      case 'home':
        return (
          <>
            <Banner movie={shuffledTrending[0] || trending[0]} onSelect={handleSelectMovie} />
            <Row id="trending" title="Trending Now" movies={shuffledTrending} showArrows onSelect={handleSelectMovie} />
            <AdSense adSlot="1234567890" />
            <Row id="movies" title="movies" movies={shuffledMovies.slice(0, 6)} onSelect={handleSelectMovie} />
            <Row id="new" title="New & Popular" movies={shuffledNewPopular.slice(0, 6)} onSelect={handleSelectMovie} />
            <AdSense adSlot="0987654321" />
            <Row id="mylist-home" title="My List" movies={combinedMyList.slice(0, 6)} onSelect={handleSelectMovie} />
            <Row id="Tv Shows" title="Tv Shows" movies={shuffledTvShows.slice(0, 6)} onSelect={handleSelectMovie} />
          </>
        );
      case 'addmovie':
        return <AddMovie onAddMovie={handleAddMovie} />;
      case 'tvshows': {
        const visibleTvShows = combinedTvShows.slice(0, tvShowsVisibleCount);
        const rows = [];
        for (let i = 0; i < visibleTvShows.length; i += 6) {
          const title = "Tv Shows";
          rows.push(
            <Row
              key={i}
              id={`TvShows${i}`}
              title={title}
              movies={visibleTvShows.slice(i, i + 6)}
              onSelect={handleSelectMovie}
            />
          );
        }
        return (
          <>
            {rows}
            {tvShowsVisibleCount < combinedTvShows.length && (
              <button
                onClick={() => setTvShowsVisibleCount((prev) => prev + 60)}
                style={{ margin: '20px auto', display: 'block' }}
              >
                Load more
              </button>
            )}
          </>
        );
      }
      case 'movies': {
        const rows = [];
        for (let i = 0; i < combinedMovies.length; i += 6) {
          const title = "Movies";
          rows.push(
            <Row
              key={i}
              id={`Movies${i}`}
              title={title}
              movies={combinedMovies.slice(i, i + 6)}
              onSelect={handleSelectMovie}
            />
          );
        }
        return <>{rows}</>;
      }
      case 'new': {
        const rows = [];
        for (let i = 0; i < newpopular.length; i += 6) {
          const title = "New & Popular";
          rows.push(
            <Row
              key={i}
              id={`New${i}`}
              title={title}
              movies={newpopular.slice(i, i + 6)}
              onSelect={handleSelectMovie}
            />
          );
        }
        return <>{rows}</>;
      }
      case 'mylist': {
        const allMyList = combinedMyList;
        const rows = [];
        for (let i = 0; i < allMyList.length; i += 6) {
          const title = "My List";
          rows.push(
            <Row
              key={i}
              id={`MyList${i}`}
              title={title}
              movies={allMyList.slice(i, i + 6)}
              onSelect={handleSelectMovie}
              onRemove={handleRemoveMovie}
            />
          );
        }
        return <>{rows}</>;
      }
      default:
        return (
          <>
            <Banner movie={shuffledTrending[0] || trending[0]} onSelect={handleSelectMovie} />
            <Row id="trending" title="Trending Now" movies={shuffledTrending} showArrows onSelect={handleSelectMovie} />
            <Row id="movies" title="movies" movies={shuffledMovies} onSelect={handleSelectMovie} />
            <Row id="new" title="New & Popular" movies={shuffledNewPopular} onSelect={handleSelectMovie} />
            <Row id="mylist" title="My List" movies={mylist} onSelect={handleSelectMovie} />
            <Row id="Tv Shows" title="Tv Shows" movies={shuffledTvShows.slice(0, 6)} onSelect={handleSelectMovie} />
          </>
        );
    }
  };

  return (
    <div className="app">
      <Header
        onNavClick={handleNavClick}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />
      <main className="content">
        {normalizedSearch && !isDetailView
          ? renderSearchResults()
          : renderContent()}
      </main>
      <Footer />
    </div>
  );
}

export default App;
