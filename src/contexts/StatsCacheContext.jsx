import React, { createContext, useContext, useState, useEffect } from 'react';

const CACHE_KEY = 'route_stats_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const StatsCacheContext = createContext();

export const StatsCacheProvider = ({ children }) => {
  const [cache, setCache] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Save to localStorage whenever cache changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  }, [cache]);

  const getCachedData = (key) => {
    const cached = cache[key];
    if (!cached) return null;

    const now = new Date().getTime();
    if (now - cached.timestamp > CACHE_DURATION) {
      // Cache expired
      return null;
    }

    return cached.data;
  };

  const setCachedData = (key, data) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: new Date().getTime()
      }
    }));
  };

  return (
    <StatsCacheContext.Provider value={{ getCachedData, setCachedData }}>
      {children}
    </StatsCacheContext.Provider>
  );
};

export const useStatsCache = () => {
  const context = useContext(StatsCacheContext);
  if (!context) {
    throw new Error('useStatsCache must be used within a StatsCacheProvider');
  }
  return context;
};
