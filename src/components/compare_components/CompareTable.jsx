import React, { useState, useEffect } from 'react';
import RouteStatistics from './RouteStatistics';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CompareTable = ({ selectedFroms = [], selectedTos = [], selectedTransportTypes = [], selectedMetric = null }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        
        if (selectedFroms?.length === 1) {
          params.append('from', selectedFroms[0]);
        }
        
        if (selectedTos?.length === 1) {
          params.append('to', selectedTos[0]);
        }
        
        if (selectedTransportTypes?.length === 1) {
          params.append('transportType', selectedTransportTypes[0]);
        }
        
        const url = `${API_BASE_URL}/api/stats/routes?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setStats(result);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Add a small debounce to prevent too many rapid requests
    const timer = setTimeout(() => {
      fetchStats();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selectedFroms, selectedTos, selectedTransportTypes]);

  return (
    <div className="p-4">
      <RouteStatistics 
        stats={stats} 
        loading={loading} 
        error={error}
        selectedMetric={selectedMetric}
      />
    </div>
  );
};

export default CompareTable;
