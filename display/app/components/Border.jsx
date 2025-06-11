// components/Border.jsx
import React from 'react';

const GradientBorderWrapper = ({ children, className = '' }) => {
  return (
    // Outer div creates the gradient background for the border
    // Changed gradient colors to a grayish-white range
    <div className={`relative p-[3px] rounded-lg bg-gradient-to-r from-gray-500 via-gray-300 to-gray-100 ${className}`}>
      <div className="bg-black rounded-[4px] h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default GradientBorderWrapper;