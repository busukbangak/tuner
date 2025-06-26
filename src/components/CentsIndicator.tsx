import React from 'react';

interface CentsIndicatorProps {
  cents: number;
}

const CentsIndicator: React.FC<CentsIndicatorProps> = ({ cents }) => (
  <div>
    {/* TODO: Visual representation of cents deviation */}
    <p>{cents > 0 ? '+' : ''}{cents.toFixed(1)} cents</p>
  </div>
);

export default CentsIndicator; 