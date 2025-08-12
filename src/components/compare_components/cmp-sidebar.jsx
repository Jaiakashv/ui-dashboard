import React, { useState, useEffect } from "react";
import { Panel } from "primereact/panel";
import { ChevronRight, ChevronDown, Columns, Rows, Check } from 'lucide-react';

const Sidebar = ({ onRowSelectionChange, onColumnChange, selectedColumn, sectionItems }) => {
  const [expandedSections, setExpandedSections] = useState({
    columns: true,
    rows: true
  });
  
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedCol, setSelectedCol] = useState(selectedColumn || 1); // Default to first column

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleRowSelection = (rowId) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(rowId)) {
        newSelection.delete(rowId);
      } else {
        newSelection.add(rowId);
      }
      return newSelection;
    });
  };

  // Notify parent component about selection changes
  useEffect(() => {
    if (onRowSelectionChange) {
      onRowSelectionChange(Array.from(selectedRows));
    }
  }, [selectedRows, onRowSelectionChange]);

  // Handle column selection change
  const handleColumnChange = (columnId) => {
    setSelectedCol(columnId);
    if (onColumnChange) {
      onColumnChange(columnId);
    }
  };

  // Use the sectionItems prop passed from parent

  return (
    <div className="bg-[#1e2836] text-white h-screen w-64 p-4 space-y-4 overflow-y-auto">
      <h1 className="text-xl font-bold mb-4 px-2">Comparison</h1>
      
      {/* Columns Section */}
      <div className="bg-[#2c3a4d] rounded-lg overflow-hidden">
        <button 
          onClick={() => toggleSection('columns')}
          className="w-full flex items-center justify-between p-3 hover:bg-[#3a4b61] transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Columns size={18} />
            <h2 className="text-base font-semibold">Columns</h2>
          </div>
          {expandedSections.columns ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {expandedSections.columns && (
          <ul className="py-1">
            {sectionItems.columns.map(item => (
              <li 
                key={item.id}
                className="px-4 py-2 text-sm hover:bg-[#3a4b61] cursor-pointer transition-colors flex items-center"
                onClick={() => handleColumnChange(item.id)}
              >
                <div className={`w-4 h-4 border rounded-full mr-2 flex-shrink-0 flex items-center justify-center ${selectedCol === item.id ? 'border-blue-400' : 'border-gray-400'}`}>
                  {selectedCol === item.id && <div className="w-2 h-2 rounded-full bg-blue-400"></div>}
                </div>
                <span className={selectedCol === item.id ? 'text-blue-300' : 'text-gray-200'}>{item.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rows Section */}
      <div className="bg-[#2c3a4d] rounded-lg overflow-hidden">
        <button 
          onClick={() => toggleSection('rows')}
          className="w-full flex items-center justify-between p-3 hover:bg-[#3a4b61] transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Rows size={18} />
            <h2 className="text-base font-semibold">Rows</h2>
          </div>
          {expandedSections.rows ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {expandedSections.rows && (
          <ul className="py-1 max-h-96 overflow-y-auto">
            {sectionItems.rows.map(item => (
              <li 
                key={item.id}
                className="px-4 py-2 text-sm hover:bg-[#3a4b61] cursor-pointer transition-colors flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowSelection(item.id);
                }}
              >
                <div className={`w-4 h-4 border rounded mr-2 flex-shrink-0 flex items-center justify-center ${selectedRows.has(item.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                  {selectedRows.has(item.id) && <Check size={12} className="text-white" />}
                </div>
                <span className={selectedRows.has(item.id) ? 'text-blue-200' : 'text-gray-200'}>{item.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
