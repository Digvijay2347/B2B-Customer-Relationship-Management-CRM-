import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0"> {/* Added min-w-0 */}
        <Header />
        <main className="flex-1 justify-center items-center ml-10 overflow-x-hidden overflow-y-auto p-4 lg:p-6"> {/* Updated padding and overflow */}
          <div className="container mx-auto max-w-full"> {/* Added max-w-full */}
            <div className="w-full overflow-hidden"> {/* Added wrapper div */}
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;