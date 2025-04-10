import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { UserCircleIcon } from '@heroicons/react/24/outline';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">CRM Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">{user.email}</span>
          <Link
            to="/profile"
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            title="Profile Settings"
          >
            <UserCircleIcon className="h-6 w-6" />
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;