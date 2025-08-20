import React, { useState, useEffect } from 'react';
import RouteStatistics from './RouteStatistics';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CompareTable = ({ selectedFroms = [], selectedTos = [], selectedTransportTypes = [] }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/stats/routes`);
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

    fetchStats();
  }, [selectedFroms, selectedTos, selectedTransportTypes]);

  return (
    <div className="p-4">
      <RouteStatistics 
        stats={stats} 
        loading={loading} 
        error={error} 
      />
    </div>
  );
};

export default CompareTable;
