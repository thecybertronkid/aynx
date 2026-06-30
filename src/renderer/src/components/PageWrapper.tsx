import React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full h-full overflow-y-auto px-6 py-6 animate-fadeIn transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
};

export default PageWrapper;
