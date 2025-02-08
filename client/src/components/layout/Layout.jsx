import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="fixed inset-y-0 left-0">
        <Sidebar />
      </div>
      <div className="flex-1 pl-64">
        <main className="w-full p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;