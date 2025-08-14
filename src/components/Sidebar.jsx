import React, { useEffect, useMemo, useState } from 'react';
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
  const [dataDropdownOpen, setDataDropdownOpen] = useState(false);
  const [visualizeDropdownOpen, setVisualizeDropdownOpen] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onViewSelect && onViewSelect(activeView);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeView, onViewSelect]);

  const dataMenuItems = useMemo(() => [
    { label: '12go', icon: icon12go, id: '12go', isImage: true, lastUpdated: new Date().toISOString() },
    { disabled: true, label: 'traveloka', icon: iconTraveloka, id: 'traveloka', isImage: true },
    { disabled: true, label: 'bookaway', icon: iconBookaway, id: 'bookaway', isImage: true },
    { disabled: true, label: 'busx', icon: iconBusx, id: 'busx', isImage: true },
    { disabled: true, label: 'redbus', icon: iconRedbus, id: 'redbus', isImage: true }
  ], []);

  const location = useLocation();
  const virtualizeMenuItems = [
    { label: 'Popular Routes', icon: 'pi pi-chart-pie', id: 'popular-routes' },
    { disabled: true, label: 'Price Graph', icon: 'pi pi-chart-bar', id: 'price-graph' },
    { disabled: true, label: 'Booking Horizon', icon: 'pi pi-calendar', id: 'booking-horizon' },
    { disabled: true, label: 'Cheapest Carriers', icon: 'pi pi-tag', id: 'cheapest-carrier' },
    { label: 'Customizable Dashboard', icon: 'pi pi-sliders-h', id: 'custom-dashboard' },
    { label: 'Compare', icon: 'pi pi-chart-line', id: 'compare', link: '/compare' },
  ];

  const handleDataMenuClick = (provider) => {
    onViewSelect('data');
    onProviderSelect(provider);

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('view', 'data');
    searchParams.set('provider', provider);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleVirtualizeMenuClick = (viewId) => {
    onViewSelect('virtualize');
    onVirtualizeViewSelect(viewId);

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('view', viewId);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const isDataSelected = activeView === 'data';
  const isVirtualizeSelected = activeView === 'virtualize';

  return (
    <div className="w-full bg-[#1E2836] text-white shadow-lg fixed top-0 left-0 right-0 z-50 ">
      <div className="container mx-auto px-4 ">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h2 className="text-xl font-semibold text-white">Popular routes</h2>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            {/* Data Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDataDropdownOpen(!dataDropdownOpen)}
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1E2836] focus:ring-blue-500"
              >
                <span>Data</span>
                <svg className="ml-2 -mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {dataDropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    {dataMenuItems.map((item) => (
                      <button
                        key={item.id}
                        disabled={item.disabled ?? false}
                        onClick={() => {
                          handleDataMenuClick(item.id);
                          setDataDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                          isDataSelected && activeProvider === item.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {item.isImage ? (
                          <img src={item.icon} alt={item.label} className="w-5 h-5 mr-3 object-contain" />
                        ) : (
                          <i className={`${item.icon} mr-3`}></i>
                        )}
                        <span className="flex-1">{item.label}</span>
                        {item.lastUpdated && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTimeAgo(item.lastUpdated)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visualize Dropdown */}
            <div className="relative">
              <button
                onClick={() => setVisualizeDropdownOpen(!visualizeDropdownOpen)}
                className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1E2836] focus:ring-blue-500"
              >
                <span>Visualize</span>
                <svg className="ml-2 -mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {visualizeDropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    {virtualizeMenuItems.map((item) => {
                      if (item.link) {
                        return (
                          <Link
                            key={item.id}
                            to={item.link}
                            onClick={() => setVisualizeDropdownOpen(false)}
                            className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${
                              location.pathname === item.link ? 'bg-gray-100' : ''
                            }`}
                          >
                            <i className={`${item.icon} mr-3`}></i>
                            {item.label}
                          </Link>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          disabled={item.disabled}
                          onClick={() => {
                            if (!item.disabled) {
                              handleVirtualizeMenuClick(item.id);
                              setVisualizeDropdownOpen(false);
                            }
                          }}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            virtualizeView === item.id
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <i className={`${item.icon} mr-3`}></i>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
