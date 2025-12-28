import React, { useState } from 'react';
import { SHA256 } from 'crypto-js';
import {
  searchMovies,
  searchTvShows,
  getDetailsByType,
  getCreditsByType,
  formatPosterPath,
  getPosterUrl,
  getTrailerUrl
} from '../tmdbService';
import './AddMovie.css'; // We'll create this

const AddMovie = ({ onAddMovie }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mediaType, setMediaType] = useState('movie');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const results = mediaType === 'tv' ? await searchTvShows(searchQuery) : await searchMovies(searchQuery);
    setSearchResults(results);
    setLoading(false);
  };

  const handleSelectItem = async (item) => {
    setLoading(true);
    setError('');
    try {
      const details = await getDetailsByType(mediaType, item.id);
      if (!details) throw new Error('Failed to fetch details');
      const credits = await getCreditsByType(mediaType, item.id);
      const trailerUrl = getTrailerUrl();
      const posterUrl = getPosterUrl(details.poster_path);

      const imdbId = mediaType === 'tv'
        ? (details.external_ids?.imdb_id || null)
        : (details.imdb_id || null);

      if (mediaType === 'tv' && !imdbId) {
        throw new Error('TMDb did not return an IMDb ID for this TV show. Please try a different result.');
      }

      const director = (() => {
        if (mediaType === 'tv') {
          return credits?.crew?.find(person => person.job === 'Creator' || person.known_for_department === 'Directing')?.name || 'Unknown';
        }
        return credits?.crew?.find(person => person.job === 'Director')?.name || 'Unknown';
      })();
      const cast = credits?.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'Unknown';

      const releaseDate = mediaType === 'tv' ? details.first_air_date : details.release_date;
      const duration = mediaType === 'tv'
        ? `${details.episode_run_time?.[0] || 'N/A'}m`
        : `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`;

      const country = mediaType === 'tv'
        ? (details.origin_country || []).join(', ')
        : details.production_countries.map(c => c.name).join(', ');

      const genre = details.genres.map(g => g.name).join(', ');

      const videoUrl = mediaType === 'tv'
        ? null
        : (trailerUrl || (imdbId ? `https://www.2embed.cc/embed/${imdbId}` : `https://www.2embed.cc/embed/${details.id}`));

      const mediaData = {
        title: mediaType === 'tv' ? details.name : details.title,
        poster_path: details.poster_path,
        description: details.overview,
        releaseDate,
        duration,
        rating: details.vote_average?.toFixed(1) || 'N/A',
        genre,
        director,
        quality: 'HD',
        country,
        cast,
        trailerImage: posterUrl,
        videoUrl,
        type: mediaType,
        servers: mediaType === 'tv'
          ? (imdbId ? [
              {
                name: 'Server 1',
                url: `https://www.2embed.cc/embedtv/${imdbId}`
              },
              {
                name: 'Server 2',
                url: `https://vidsrc-embed.ru/embed/tv/${imdbId}`
              }
            ] : undefined)
          : (!videoUrl ? undefined : [
              {
                name: 'Default',
                url: videoUrl
              },
              ...(imdbId ? [
                {
                  name: 'Server 2',
                  url: `https://vidsrc-embed.ru/embed/movie/${imdbId}`
                }
              ] : [])
            ]),
        seasons: mediaType === 'tv' ? details.number_of_seasons : undefined,
        episodes: mediaType === 'tv' ? details.number_of_episodes : undefined,
        seasonsEpisodes: mediaType === 'tv' ? details.seasons?.map(season => season.episode_count || 0) : undefined
      };

      setSelectedItem(mediaData);
    } catch (err) {
      setError(`Error loading movie details: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToList = () => {
    if (selectedItem) {
      const password = window.prompt('Enter admin password to add movie:').trim();
      const enteredHash = SHA256(password).toString();
      if (enteredHash === import.meta.env.VITE_ADMIN_PASSWORD_HASH) {
        onAddMovie(selectedItem);
        // Reset
        setSearchQuery('');
        setSearchResults([]);
        setSelectedItem(null);
      } else {
        alert('Incorrect password. Access denied.');
      }
    }
  };

  return (
    <div className="add-movie">
      <h2>Add New {mediaType === 'tv' ? 'TV Show' : 'Movie'}</h2>
      <div className="search-section">
        <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
          <option value="movie">Movie</option>
          <option value="tv">TV Show</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search for a ${mediaType === 'tv' ? 'TV show' : 'movie'}...`}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : `Search TMDb (${mediaType.toUpperCase()})`}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>Search Results:</h3>
          <ul>
            {searchResults.map((item) => (
              <li key={item.id} onClick={() => handleSelectItem(item)}>
                <img src={getPosterUrl(item.poster_path)} alt={item.title || item.name} />
                <div>
                  <h4>{item.title || item.name}</h4>
                  <p>{item.release_date || item.first_air_date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {selectedItem && (
        <div className="selected-movie">
          <h3>Selected {selectedItem.type === 'tv' ? 'TV Show' : 'Movie'}:</h3>
          <div className="movie-preview">
            <img
              src={selectedItem.trailerImage || formatPosterPath(selectedItem.poster_path) || 'https://via.placeholder.com/200x300?text=No+Image'}
              alt={selectedItem.title}
              onError={(event) => {
                event.currentTarget.src = 'https://via.placeholder.com/200x300?text=No+Image';
              }}
            />
            <div>
              <h4>{selectedItem.title}</h4>
              <p>{selectedItem.description}</p>
              <p>Release: {selectedItem.releaseDate}</p>
              <p>Rating: {selectedItem.rating}</p>
              <p>Genre: {selectedItem.genre}</p>
              <p>{selectedItem.type === 'tv' ? 'Episode Length' : 'Duration'}: {selectedItem.duration}</p>
              {selectedItem.type === 'tv' && (
                <>
                  <p>Seasons: {selectedItem.seasons}</p>
                  <p>Total Episodes: {selectedItem.episodes}</p>
                </>
              )}
              <button onClick={handleAddToList}>Add to My List</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMovie;
