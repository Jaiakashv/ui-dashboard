import React from 'react';
import { Card } from 'primereact/card';
import QueryBuilder from '../querybuilder/QueryBuilder';

const CustomDashboard = ({ data }) => {
  const handleQueryRun = (results) => {
    console.log('Query results:', results);
    // You can add additional logic here to handle the query results
  };

  return (
    <div className="custom-dashboard">
      <div className="grid">
        <div className="col-12">
        
        </div>
        
        <div className="col-12">
          <QueryBuilder 
            data={data} 
            onRunQuery={handleQueryRun} 
          />
        </div>
      </div>
    </div>
  );
};

export default CustomDashboard;