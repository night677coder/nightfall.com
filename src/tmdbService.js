import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'YOUR_API_KEY_HERE'; // Replace with your TMDb API key
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // For poster images, can change size

export const searchMovies = async (query) => {
  try {
    const response = await axios.get(`${BASE_URL}/search/movie`, {
      params: {
        api_key: API_KEY,
        query: query,
      },
    });
    return response.data.results;
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

export const searchTvShows = async (query) => {
  try {
    const response = await axios.get(`${BASE_URL}/search/tv`, {
      params: {
        api_key: API_KEY,
        query
      }
    });
    return response.data.results;
  } catch (error) {
    console.error('Error searching TV shows:', error);
    return [];
  }
};

export const getMovieDetails = async (movieId) => {
  try {
    const response = await axios.get(`${BASE_URL}/movie/${movieId}`, {
      params: {
        api_key: API_KEY,
        append_to_response: 'external_ids',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

export const getMovieVideos = async (movieId) => {
  try {
    const response = await axios.get(`${BASE_URL}/movie/${movieId}/videos`, {
      params: {
        api_key: API_KEY,
      },
    });
    return response.data.results;
  } catch (error) {
    console.error('Error fetching movie videos:', error);
    return [];
  }
};

export const getPosterUrl = (posterPath) => {
  return posterPath ? `${IMAGE_BASE_URL}${posterPath}` : 'https://via.placeholder.com/200x300?text=No+Image';
};

export const getTrailerUrl = () => {
  // Always use 2embed fallback instead of YouTube
  return null;
};

export const getMovieCredits = async (movieId) => {
  try {
    const response = await axios.get(`${BASE_URL}/movie/${movieId}/credits`, {
      params: {
        api_key: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching movie credits:', error);
    return null;
  }
};

export const getDetailsByType = (type, id) => {
  return type === 'tv' ? getTvDetails(id) : getMovieDetails(id);
};

export const getVideosByType = (type, id) => {
  return type === 'tv' ? getTvVideos(id) : getMovieVideos(id);
};

export const getCreditsByType = (type, id) => {
  return type === 'tv' ? getTvCredits(id) : getMovieCredits(id);
};

export const formatPosterPath = (posterPath) => {
  if (!posterPath) {
    return null;
  }
  return posterPath.startsWith('http') ? posterPath : `${IMAGE_BASE_URL}${posterPath}`;
};

export const getTvDetails = async (tvId) => {
  try {
    const response = await axios.get(`${BASE_URL}/tv/${tvId}`, {
      params: {
        api_key: API_KEY,
        append_to_response: 'external_ids',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching TV show details:', error);
    return null;
  }
};

export const getTvVideos = async (tvId) => {
  try {
    const response = await axios.get(`${BASE_URL}/tv/${tvId}/videos`, {
      params: {
        api_key: API_KEY,
      },
    });
    return response.data.results;
  } catch (error) {
    console.error('Error fetching TV show videos:', error);
    return [];
  }
};

export const getTvCredits = async (tvId) => {
  try {
    const response = await axios.get(`${BASE_URL}/tv/${tvId}/credits`, {
      params: {
        api_key: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching TV show credits:', error);
    return null;
  }
};
