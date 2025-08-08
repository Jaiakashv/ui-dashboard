import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import icon12go from '../assets/12go.png';
import iconTraveloka from '../assets/traveloka.png';
import iconBookaway from '../assets/bookaway.png';
import iconBusx from '../assets/busx.png';
import iconRedbus from '../assets/redbus.png';

// File metadata will be injected by Vite plugin
const fileMeta = {};

// Function to format time ago
const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  
  return 'just now';
};
const Sidebar = ({ onProviderSelect, onViewSelect, onVirtualizeViewSelect, activeProvider, activeView, virtualizeView }) => {
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onViewSelect && onViewSelect(activeView);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeView, onViewSelect]);

  // State for file metadata
  const [fileMetadata, setFileMetadata] = useState({});

  // Load file metadata on component mount
  useEffect(() => {
    import('virtual:file-meta')
      .then(module => setFileMetadata(module.default || {}))
      .catch(e => console.warn('Could not load file metadata', e));
  }, []);

  // Data menu items with file metadata
  const dataMenuItems = useMemo(() => {
    const items = [
      { label: '12go', icon: icon12go, id: '12go', isImage: true },
      { disabled: true, label: 'traveloka', icon: iconTraveloka, id: 'traveloka', isImage: true },
      { disabled: true, label: 'bookaway', icon: iconBookaway, id: 'bookaway', isImage: true },
      { disabled: true, label: 'busx', icon: iconBusx, id: 'busx', isImage: true },
      { disabled: true, label: 'redbus', icon: iconRedbus, id: 'redbus', isImage: true },
    ];

    // Add file modification times if available
    return items.map(item => ({
      ...item,
      lastUpdated: fileMetadata[item.id]?.lastModified || null
    }));
  }, [fileMetadata]);

  const virtualizeMenuItems = [
    { label: 'Popular Routes', icon: 'pi pi-chart-pie', id: 'popular-routes',},
    { disabled: true, label: 'Price Graph', icon: 'pi pi-chart-bar', id: 'price-graph' },
    { disabled: true, label: 'Booking Horizon', icon: 'pi pi-calendar', id: 'booking-horizon' },
    { disabled: true, label: 'Cheapest Carriers', icon: 'pi pi-tag', id: 'cheapest-carrier' },
  ];

  const handleDataMenuClick = (provider) => {
    onViewSelect('data');
    onProviderSelect(provider);
  };

  const handleVirtualizeMenuClick = (viewId) => {
    onViewSelect('virtualize');
    onVirtualizeViewSelect(viewId);
  };

  const isDataSelected = activeView === 'data';
  const isVirtualizeSelected = activeView === 'virtualize';

  return (
    <div className="sidebar h-screen w-64 bg-white shadow-lg flex flex-col md:relative fixed md:static z-50">
      {/* Logo - Hidden on mobile as it's in the header */}
      <div className="hidden md:flex p-4 border-b border-gray-200 items-center justify-center">
        <h2 className="text-xl font-semibold text-blue-700">Popular routes</h2>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <h1 className="font-semibold text-blue-700 mb-2 px-4" style={{ fontSize: '1.25rem' }}>Data</h1>
        <ul className="space-y-1 px-2 mb-6">
          {dataMenuItems.map((item) => (
            <li key={item.id}>
              <button
              disabled={item.disabled ?? false}
                onClick={() => handleDataMenuClick(item.id)}
                className={`w-full text-left flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isDataSelected && activeProvider === item.id
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${item.disabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    {item.isImage ? (
                      <img src={item.icon} alt={item.label} className="w-5 h-5 mr-3 object-contain" />
                    ) : (
                      <i className={`${item.icon} mr-3 text-base`}></i>
                    )}
                    {item.label}
                  </div>
                  {item.lastUpdated && (
                    <span 
                      className="text-xs text-gray-500 ml-2 whitespace-nowrap px-1.5 py-0.5 bg-gray-100 rounded-full"
                      title={`Last updated: ${new Date(item.lastUpdated).toLocaleString()}`}
                    >
                      {formatTimeAgo(item.lastUpdated)}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
        
        <h1 className="font-semibold text-blue-700 mb-2 px-4" style={{ fontSize: '1.25rem' }}>Visualize</h1>
        <ul className="space-y-1 px-2">
          {virtualizeMenuItems.map((item) => (
            <li key={item.id}>
              <button
              disabled={item.disabled ?? false}
                onClick={() => handleVirtualizeMenuClick(item.id)}
                className={`w-full text-left flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isVirtualizeSelected && virtualizeView === item.id
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${item.disabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    {item.isImage ? (
                      <img src={item.icon} alt={item.label} className="w-5 h-5 mr-3 object-contain" />
                    ) : (
                      <i className={`${item.icon} mr-3 text-base`}></i>
                    )}
                    {item.label}
                  </div>
                  {item.lastUpdated && (
                    <span 
                      className="text-xs text-gray-500 ml-2 whitespace-nowrap px-1.5 py-0.5 bg-gray-100 rounded-full"
                      title={`Last updated: ${new Date(item.lastUpdated).toLocaleString()}`}
                    >
                      {formatTimeAgo(item.lastUpdated)}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>  
    </div>
  );
};

export default Sidebar;
