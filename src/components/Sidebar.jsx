import React, { useEffect, useMemo } from 'react';
import { Button } from 'primereact/button';
import { Link, useLocation } from 'react-router-dom';
import icon12go from '../assets/12go.png';
import iconTraveloka from '../assets/traveloka.png';
import iconBookaway from '../assets/bookaway.png';
import iconBusx from '../assets/busx.png';
import iconRedbus from '../assets/redbus.png';

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

  // Data menu items
  const dataMenuItems = useMemo(() => [
    { 
      label: '12go', 
      icon: icon12go, 
      id: '12go', 
      isImage: true,
      lastUpdated: new Date().toISOString() // Using current time as last updated
    },
    { 
      disabled: true, 
      label: 'traveloka', 
      icon: iconTraveloka, 
      id: 'traveloka', 
      isImage: true 
    },
    { 
      disabled: true, 
      label: 'bookaway', 
      icon: iconBookaway, 
      id: 'bookaway', 
      isImage: true 
    },
    { 
      disabled: true, 
      label: 'busx', 
      icon: iconBusx, 
      id: 'busx', 
      isImage: true 
    },
    { 
      disabled: true, 
      label: 'redbus', 
      icon: iconRedbus, 
      id: 'redbus', 
      isImage: true 
    }
  ], []);

  const location = useLocation();
  const virtualizeMenuItems = [
    { label: 'Popular Routes', icon: 'pi pi-chart-pie', id: 'popular-routes' },
    { disabled: true, label: 'Price Graph', icon: 'pi pi-chart-bar', id: 'price-graph' },
    { disabled: true, label: 'Booking Horizon', icon: 'pi pi-calendar', id: 'booking-horizon' },
    { disabled: true, label: 'Cheapest Carriers', icon: 'pi pi-tag', id: 'cheapest-carrier' },
    { label: 'Customizable Dashboard', icon: 'pi pi-sliders-h', id: 'custom-dashboard' },
    { label: 'Compare', icon: 'pi pi-chart-line', id: 'compare', link: '/compare'},
  ];

  const handleDataMenuClick = (provider) => {
    onViewSelect('data');
    onProviderSelect(provider);
    
    // Update URL with query parameters
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('view', 'data');
    searchParams.set('provider', provider);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleVirtualizeMenuClick = (viewId) => {
    onViewSelect('virtualize');
    onVirtualizeViewSelect(viewId);
    
    // Update URL with query parameter
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('view', viewId);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const isDataSelected = activeView === 'data';
  const isVirtualizeSelected = activeView === 'virtualize';

  const renderVirtualizeMenuItems = () => {
    return virtualizeMenuItems.map((item) => {
      if (item.link) {
        return (
          <li key={item.id} className="p-menuitem">
            <Link 
              to={item.link}
              className={`p-menuitem-link ${location.pathname === item.link ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} flex items-center p-3`}
            >
              <i className={`${item.icon} mr-2`}></i>
              <span className="p-menuitem-text">{item.label}</span>
            </Link>
          </li>
        );
      }
      
      return (
        <li 
          key={item.id}
          className={`p-menuitem ${item.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700'} ${virtualizeView === item.id ? 'bg-[#1E2836] text-white border-l-4 border-blue-500' : 'text-gray-300 hover:text-white'}`}
          onClick={() => !item.disabled && handleVirtualizeMenuClick(item.id)}
        >
          <span className="p-menuitem-link flex items-center p-3">
            {item.isImage ? (
              <img src={item.icon} alt={item.label} className="w-5 h-5 mr-3 object-contain" />
            ) : (
              <i className={`${item.icon} mr-2`}></i>
            )}
            <span className="p-menuitem-text">{item.label}</span>
          </span>
        </li>
      );
    });
  };

  return (
    <div className="sidebar h-screen w-64 bg-[#1E2836] text-white shadow-lg flex flex-col md:relative fixed md:static z-50">
      {/* Logo - Hidden on mobile as it's in the header */}
      <div className="hidden md:flex p-4 border-b border-gray-600 items-center justify-center">
        <h2 className="text-xl font-semibold text-white">Popular routes</h2>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <h1 className="font-semibold text-white mb-2 px-4" style={{ fontSize: '1.25rem' }}>Data</h1>
        <ul className="space-y-1 px-2 mb-6">
          {dataMenuItems.map((item) => (
            <li key={item.id}>
              <button
              disabled={item.disabled ?? false}
                onClick={() => handleDataMenuClick(item.id)}
                className={`w-full text-left flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isDataSelected && activeProvider === item.id
                    ? 'bg-[#1E2836] text-white border-l-4 border-blue-500' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
                      className="text-xs text-gray-300 ml-2 whitespace-nowrap px-1.5 py-0.5 bg-gray-700 rounded-full"
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
        
        <h1 className="font-semibold text-white mb-2 px-4" style={{ fontSize: '1.25rem' }}>Visualize</h1>
        <ul className="space-y-1 px-2">
          {renderVirtualizeMenuItems()}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
