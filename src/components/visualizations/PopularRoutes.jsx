import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Dropdown } from 'primereact/dropdown';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const ROUTE_COUNT_OPTIONS = [
  { label: 'Top 5', value: 5 },
  { label: 'Top 10', value: 10 },
  { label: 'Top 20', value: 20 },
  { label: 'Top 50', value: 50 },
];

const PopularRoutes = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeCount, setRouteCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPopularRoutes = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/popular?limit=50`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load route data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularRoutes();
  }, []);

  const processedData = useMemo(() => {
    if (!data || !data.length) return [];
    
    return data
      .map(route => ({
        ...route,
        total_trips: parseInt(route.total_trips) || 0,
        from: route.route_name?.split(' -- ')[0] || 'Unknown',
        to: route.route_name?.split(' -- ')[1] || 'Unknown'
      }))
      .sort((a, b) => b.total_trips - a.total_trips);
  }, [data]);

  const filteredRoutes = useMemo(() => {
    if (!searchTerm) return processedData;
    const term = searchTerm.toLowerCase();
    return processedData.filter(route => 
      route.from.toLowerCase().includes(term) || 
      route.to.toLowerCase().includes(term) ||
      route.route_name.toLowerCase().includes(term)
    );
  }, [processedData, searchTerm]);

  const displayRoutes = useMemo(() => {
    return filteredRoutes.slice(0, routeCount);
  }, [filteredRoutes, routeCount]);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Popular Routes</h2>
        <p className="text-gray-600">Loading route data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Popular Routes</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="p-6 bg-white rounded-lg shadow mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Popular Routes</h2>
        <p className="text-gray-600">No route data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Popular Routes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Showing {Math.min(displayRoutes.length, routeCount)} of {filteredRoutes.length} routes
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Search routes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          <Dropdown
            value={routeCount}
            options={ROUTE_COUNT_OPTIONS}
            onChange={(e) => setRouteCount(e.value)}
            optionLabel="label"
            className="w-32"
            placeholder="Show"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From → To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trips</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayRoutes.map((route, index) => (
              <tr key={`${route.route_name}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {route.from} → {route.to}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{route.total_trips.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{route.provider || '12go'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!displayRoutes.length && (
        <div className="mt-4 p-4 text-center text-gray-500">
          No routes found matching your search criteria
        </div>
      )}
    </div>
  );
};

export default PopularRoutes;