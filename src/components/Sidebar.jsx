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
  const [isDataDropdownOpen, setIsDataDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onViewSelect && onViewSelect(activeView);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeView, onViewSelect]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      const handleRouteChange = () => {
        setIsMobileMenuOpen(false);
      };
      window.addEventListener('popstate', handleRouteChange);
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [isMobileMenuOpen]);

  const dataMenuItems = useMemo(() => [
    { label: '12go', icon: icon12go, id: '12go', isImage: true, lastUpdated: new Date().toISOString() },
    { disabled: true, label: 'traveloka', icon: iconTraveloka, id: 'traveloka', isImage: true },
    { label: 'bookaway', icon: iconBookaway, id: 'bookaway', isImage: true },
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.data-dropdown')) {
        setIsDataDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDataDropdown = () => {
    setIsDataDropdownOpen(!isDataDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleDataMenuClick = (provider) => {
    onViewSelect('data');
    onProviderSelect(provider);
    setIsDataDropdownOpen(false);

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('view', 'data');
    searchParams.set('provider', provider);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleVirtualizeMenuClick = (viewId) => {
    onViewSelect('virtualize');
    onVirtualizeViewSelect(viewId);
    setIsDataDropdownOpen(false);

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('view', 'virtualize');
    searchParams.set('tab', viewId);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const isDataSelected = activeView === 'data' && activeProvider;
  const isVirtualizeSelected = activeView === 'virtualize' && virtualizeView;

  return (
    <div className="w-full bg-[#1E2836] text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-16 max-w-screen-2xl mx-auto">
          <div className="flex items-center">
            {/* Mobile menu button - only visible on mobile */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            
            {/* Logo */}
            <div className="flex-shrink-0 ml-4">
              <h2 className="text-xl font-semibold text-white">Popular routes</h2>
            </div>
          </div>

          {/* Desktop Navigation - hidden on mobile */}
          <div className="hidden md:block flex-1">
            <div className="flex items-center justify-end space-x-4">
              {/* Data Dropdown */}
              <div className="relative data-dropdown flex-shrink-0">
                <button
                  onClick={toggleDataDropdown}
                  className={`flex items-center px-4 py-2 text-sm font-medium text-white hover:text-blue-300 relative ${isDataDropdownOpen ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-400' : ''}`}
                >
                  <span>Data</span>
                  <svg className="ml-2 -mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {isDataDropdownOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      {dataMenuItems.map((item) => (
                        <button
                          key={item.id}
                          disabled={item.disabled ?? false}
                          onClick={() => handleDataMenuClick(item.id)}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center relative ${
                            isDataSelected && activeProvider === item.id
                              ? 'text-blue-600 font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-400'
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

              {/* Visualize Menu Items */}
              <div className="flex space-x-1 overflow-x-auto">
                {virtualizeMenuItems.map((item) => (
                  <div key={item.id} className="relative">
                    {item.link ? (
                      <Link
                        to={item.link}
                        onClick={() => {
                          onViewSelect('virtualize');
                          onVirtualizeViewSelect(item.id);
                        }}
                        className={`flex items-center px-4 py-2 text-sm font-medium text-white hover:text-blue-300 relative ${
                          isVirtualizeSelected && item.id === virtualizeView ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-400' : ''
                        }`}
                      >
                        <i className={`${item.icon} mr-2`}></i>
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        disabled={item.disabled}
                        onClick={() => {
                          if (!item.disabled) {
                            onViewSelect('virtualize');
                            handleVirtualizeMenuClick(item.id);
                          }
                        }}
                        className={`flex items-center px-4 py-2 text-sm font-medium text-white hover:text-blue-300 relative ${
                          isVirtualizeSelected && item.id === virtualizeView
                            ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-400'
                            : ''
                        } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <i className={`${item.icon} mr-2`}></i>
                        {item.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu - only shown when toggled */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#1E293B] z-40 overflow-y-auto mt-16">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Data Section */}
            <div className="px-2 pt-2 pb-3 space-y-1">
              <div className="text-gray-300 px-3 py-2 text-sm font-medium">Data</div>
              {dataMenuItems.map((item) => (
                <button
                  key={`mobile-${item.id}`}
                  disabled={item.disabled}
                  onClick={() => {
                    handleDataMenuClick(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-base font-medium flex items-center ${
                    isDataSelected && activeProvider === item.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {item.isImage ? (
                    <img src={item.icon} alt={item.label} className="w-5 h-5 mr-3" />
                  ) : (
                    <i className={`${item.icon} mr-3 w-5 text-center`}></i>
                  )}
                  {item.label}
                  {item.lastUpdated && (
                    <span className="ml-auto text-xs text-gray-400">
                      {formatTimeAgo(item.lastUpdated)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Visualize Section */}
            <div className="border-t border-gray-700 pt-4 pb-3">
              <div className="text-gray-300 px-3 py-2 text-sm font-medium">Visualize</div>
              {virtualizeMenuItems.map((item) => (
                <div key={`mobile-${item.id}`} className="px-2">
                  {item.link ? (
                    <Link
                      to={item.link}
                      onClick={() => {
                        onViewSelect('virtualize');
                        onVirtualizeViewSelect(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block px-3 py-2 rounded-md text-base font-medium ${
                        isVirtualizeSelected && item.id === virtualizeView
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      disabled={item.disabled}
                      onClick={() => {
                        if (!item.disabled) {
                          onViewSelect('virtualize');
                          handleVirtualizeMenuClick(item.id);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                        isVirtualizeSelected && item.id === virtualizeView
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
