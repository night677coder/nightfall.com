import React, { useState, useEffect, useMemo } from 'react';
import './MovieDetail.css';
import Row from './Row';

function MovieDetail({ movie, recommended = [], onSelect, onBack }) {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [maxEpisodes, setMaxEpisodes] = useState(movie.seasonsEpisodes ? movie.seasonsEpisodes[0] : 10);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const buildTvEpisodeUrl = (baseUrl, season, episode) => {
    if (!baseUrl) return null;
    const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (trimmed.includes('vidsrc-embed.ru/embed/tv/')) {
      return `${trimmed}/${season}-${episode}`;
    }
    if (trimmed.includes('vidsrc.cc/v2/embed/tv/')) {
      return `${trimmed}/${season}/${episode}`;
    }
    return `${trimmed}?s=${season}&e=${episode}`;
  };

  const extractImdbId = (value) => {
    if (!value) return null;
    const match = String(value).match(/tt\d{5,10}/i);
    return match ? match[0] : null;
  };

  const posterSrc = movie?.poster_path
    ? movie.poster_path.startsWith('http')
      ? movie.poster_path
      : `https://image.tmdb.org/t/p/w780${movie.poster_path}`
    : 'https://via.placeholder.com/220x330?text=No+Image';

  const handlePosterError = (event) => {
    event.target.src = 'https://via.placeholder.com/220x330?text=No+Image';
  };

  const availableServers = useMemo(() => {
    const uniqueServers = movie.servers ? [...movie.servers] : [];
    const baseUrl = movie.videoUrl || uniqueServers[0]?.url || null;

    const imdbId = extractImdbId(baseUrl) || extractImdbId(movie.servers?.[0]?.url);

    if (baseUrl && !uniqueServers.some(server => server.url === baseUrl)) {
      uniqueServers.unshift({ name: 'Default', url: baseUrl });
    }

    if (!uniqueServers.length && baseUrl) {
      uniqueServers.push({ name: 'Default', url: baseUrl });
    }

    if (imdbId) {
      const vidsrcUrl = movie.type === 'tv'
        ? `https://vidsrc-embed.ru/embed/tv/${imdbId}`
        : `https://vidsrc-embed.ru/embed/movie/${imdbId}`;

      if (!uniqueServers.some((s) => s.url === vidsrcUrl)) {
        uniqueServers.push({ name: 'Server 2', url: vidsrcUrl });
      }

      const vidsrcV2Url = movie.type === 'tv'
        ? `https://vidsrc.cc/v2/embed/tv/${imdbId}`
        : `https://vidsrc.cc/v2/embed/movie/${imdbId}`;

      if (!uniqueServers.some((s) => s.url === vidsrcV2Url)) {
        uniqueServers.push({ name: 'Server 3', url: vidsrcV2Url });
      }
    }

    return uniqueServers;
  }, [movie]);

  const [activeServer, setActiveServer] = useState(availableServers[0]?.name || null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(
    availableServers[0]?.url || (movie.type === 'tv' ? null : movie.videoUrl || null)
  );

  const tvIframeSrc = useMemo(() => {
    if (movie.type !== 'tv') return null;
    const active = availableServers.find((s) => s.name === activeServer) || availableServers[0];
    const baseUrl = (active?.url || movie.servers?.[0]?.url || '').split('?')[0];
    if (!baseUrl) return null;

    return buildTvEpisodeUrl(baseUrl, selectedSeason, selectedEpisode);
  }, [movie.type, movie.servers, availableServers, activeServer, selectedSeason, selectedEpisode]);

  useEffect(() => {
    const newMax = movie.seasonsEpisodes ? movie.seasonsEpisodes[selectedSeason - 1] : 10;
    setMaxEpisodes(newMax);
    if (selectedEpisode > newMax) {
      setSelectedEpisode(1);
    }
  }, [selectedSeason, movie.seasonsEpisodes, selectedEpisode]);

  useEffect(() => {
    if (availableServers.length) {
      setActiveServer(availableServers[0].name);
      if (movie.type === 'tv') {
        setActiveVideoUrl(buildTvEpisodeUrl(availableServers[0].url, selectedSeason, selectedEpisode));
      } else {
        setActiveVideoUrl(availableServers[0].url);
      }
    } else {
      setActiveServer(null);
      setActiveVideoUrl(movie.videoUrl || null);
    }
  }, [movie, availableServers]);

  useEffect(() => {
    if (movie.type !== 'tv') return;
    if (!availableServers.length) return;

    const active = availableServers.find((s) => s.name === activeServer) || availableServers[0];
    const baseUrl = (active?.url || '').split('?')[0];
    if (!baseUrl) return;

    setActiveVideoUrl(buildTvEpisodeUrl(baseUrl, selectedSeason, selectedEpisode));
  }, [movie.type, availableServers, activeServer, selectedSeason, selectedEpisode]);

  return (
    <div className="detail">
      <button className="detail__back" onClick={onBack}>
        ← Back
      </button>

      <section className="detail__info">
        <img
          className="detail__poster"
          src={posterSrc}
          alt={movie.title}
          onError={handlePosterError}
        />
        <div className="detail__meta">
          <h1>{movie.title}</h1>
          <div className="detail__grid">
            <div>
              <span className="detail__label">Title</span>
              <span>{movie.title}</span>
            </div>
            <div>
              <span className="detail__label">Quality</span>
              <span>{movie.quality || 'HD'}</span>
            </div>
            <div>
              <span className="detail__label">Released</span>
              <span>{movie.releaseDate}</span>
            </div>
            <div>
              <span className="detail__label">Genre</span>
              <span>{movie.genre}</span>
            </div>
            <div>
              <span className="detail__label">Country</span>
              <span>{movie.country || 'United States'}</span>
            </div>
            <div>
              <span className="detail__label">Cast</span>
              <span>{movie.cast || 'Cast information not available'}</span>
            </div>
            <div>
              <span className="detail__label">{movie.type === "tv" ? "Seasons" : "Duration"}</span>
              <span>{movie.type === "tv" ? movie.seasons : movie.duration}</span>
            </div>
            {movie.type === "tv" && (
              <div>
                <span className="detail__label">Episodes</span>
                <span>{movie.episodes}</span>
              </div>
            )}
            <div>
              <span className="detail__label">Rating</span>
              <span>⭐ {movie.rating}</span>
            </div>
            <div>
              <span className="detail__label">Director</span>
              <span>{movie.director}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="detail__trailer">
        <h2>Watch {movie.title} Online</h2>
        <div className="detail__trailerBox">
          {movie.type === "tv" ? (
            <iframe
              key={`${activeServer || 'tv'}-${selectedSeason}-${selectedEpisode}`}
              src={tvIframeSrc || `https://www.2embed.cc/embedtv/tt0944947?s=${selectedSeason}&e=${selectedEpisode}`}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              allow="fullscreen; encrypted-media; autoplay; picture-in-picture"
              title={`${movie.title} trailer`}
            ></iframe>
          ) : (activeVideoUrl || movie.videoUrl) ? (
            <iframe
              key={activeServer}
              src={activeVideoUrl || movie.videoUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              allow="fullscreen; encrypted-media; autoplay; picture-in-picture"
              title={`${movie.title} trailer`}
            ></iframe>
          ) : isVideoPlaying ? (
            <iframe
              src={movie.videoUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              allow="fullscreen; encrypted-media; autoplay; picture-in-picture"
              title={`${movie.title} trailer`}
            ></iframe>
          ) : (
            <>
              <img src={movie.trailerImage} alt={`${movie.title} trailer`} />
              <button
                className="detail__play"
                onClick={() => setIsVideoPlaying(true)}
              >
                ▶
              </button>
            </>
          )}
        </div>
        {availableServers.length > 0 && (
          <div className="detail__servers">
            <h3>Available Servers</h3>
            <div className="detail__serverButtons">
              {availableServers.map((server) => (
                <button
                  key={server.name}
                  className={`detail__serverButton${server.name === activeServer ? ' detail__serverButton--active' : ''}`}
                  onClick={() => {
                    setActiveServer(server.name);
                    if (movie.type === 'tv') {
                      setActiveVideoUrl(
                        buildTvEpisodeUrl(server.url, selectedSeason, selectedEpisode)
                      );
                    } else {
                      setActiveVideoUrl(server.url);
                    }
                    setIsVideoPlaying(true);
                  }}
                >
                  {server.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {movie.type === "tv" && (
          <div className="detail__selectors">
            <label>Season: 
              <select value={selectedSeason} onChange={(e) => setSelectedSeason(Number(e.target.value))}>
                {Array.from({ length: movie.seasons }, (_, i) => i + 1).map(season => (
                  <option key={season} value={season}>Season {season}</option>
                ))}
              </select>
            </label>
            <label>Episode: 
              <select value={selectedEpisode} onChange={(e) => setSelectedEpisode(Number(e.target.value))}>
                {Array.from({ length: maxEpisodes }, (_, i) => i + 1).map(episode => (
                  <option key={episode} value={episode}>Episode {episode}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <section className="detail__synopsis">
        <h2>Synopsis</h2>
        <p>{movie.description}</p>
      </section>

      {recommended.length > 0 && (
        <section className="detail__recommend">
          <h2>You May Also Like</h2>
          <Row
            id="recommended"
            title="Recommended"
            movies={recommended}
            onSelect={onSelect}
          />
        </section>
      )}
    </div>
  );
}

export default MovieDetail;
