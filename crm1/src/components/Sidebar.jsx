import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import WorkIcon from '@mui/icons-material/Work';
import HistoryIcon from '@mui/icons-material/History';
import CampaignIcon from '@mui/icons-material/Campaign';
import AutomationIcon from '@mui/icons-material/AutoFixHigh';
import ChatIcon from '@mui/icons-material/Chat';
import MessageIcon from '@mui/icons-material/Message'; // Add this import
import Badge from '@mui/material/Badge';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'; // Add this import

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { activeChats, pendingChats, isConnected } = useChat();

  const totalChats = (activeChats?.length || 0) + (pendingChats?.length || 0);

  const navItems = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: <DashboardIcon />,
      showAlways: true
    },
    { 
      path: '/customers', 
      label: 'Customers', 
      icon: <PeopleIcon />,
      showAlways: true
    },
    { 
      path: '/calendar',
      label: 'Calendar', 
      icon: <CalendarTodayIcon />,
      showAlways: true
    },
    { 
      path: '/campaigns', 
      label: 'Campaigns', 
      icon: <CampaignIcon />, 
      adminOrManager: true 
    },
    { 
      path: '/workflows', 
      label: 'Workflows', 
      icon: <AutomationIcon />, 
      adminOrManager: true 
    },
    { 
      path: '/users', 
      label: 'Users', 
      icon: <PersonIcon />, 
      adminOnly: true 
    },
    { 
      path: '/activities', 
      label: 'Activities', 
      icon: <HistoryIcon />, 
      adminOnly: true 
    },
    { 
      path: '/chat', 
      label: 'Chat', 
      icon: (
        <Badge 
          badgeContent={totalChats} 
          color="error"
          invisible={totalChats === 0}
          max={99}
          overlap="circular"
        >
          <ChatIcon />
        </Badge>
      ),
      showAlways: true,
      connectionStatus: isConnected ? 'connected' : 'disconnected'
    },
    { 
      path: '/messages', 
      label: 'Messages', 
      icon: (
        <Badge 
          badgeContent={activeChats?.length || 0} 
          color="error"
          invisible={!activeChats?.length}
          max={99}
          overlap="circular"
        >
          <MessageIcon />
        </Badge>
      ),
      adminOrManager: true, // Only show for admins and managers
      connectionStatus: isConnected ? 'connected' : 'disconnected'
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: <SettingsIcon />,
      showAlways: true
    },
    { 
      path: '/pipeline', 
      label: 'Pipeline', 
      icon: <MonetizationOnIcon />,
      showAlways: true
    },
  ];

  const isItemVisible = (item) => {
    if (item.showAlways) return true;
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.adminOrManager && !['admin', 'manager'].includes(user?.role)) return false;
    return true;
  };

  return (
    <aside className="w-16 bg-gray-900 h-screen flex flex-col fixed left-0 top-0 z-50">
      {/* Logo Section */}
      <div className="pt-4 pb-2">
        <div className="w-8 h-8 mx-auto bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">CRM</span>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 flex flex-col justify-between">
        {/* Main Navigation Items */}
        <div className="space-y-2 px-3 py-2">
          {navItems.filter(isItemVisible).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                p-3 rounded-xl transition-all duration-200 
                group relative flex items-center justify-center
                ${location.pathname === item.path 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                ${item.connectionStatus === 'disconnected' ? 'opacity-50' : ''}
              `}
            >
              <div className="w-6 h-6">
                {item.icon}
              </div>
              
              {/* Tooltip */}
              <div className="
                absolute left-16 bg-gray-800 text-white px-2 py-1 rounded 
                text-sm whitespace-nowrap opacity-0 invisible
                group-hover:opacity-100 group-hover:visible
                transition-all duration-200 z-50 flex items-center gap-2
              ">
                {item.label}
                {item.connectionStatus && (
                  <span className={`w-2 h-2 rounded-full ${
                    item.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                )}
                {item.path === '/messages' && activeChats?.length > 0 && (
                  <span className="text-xs bg-red-500 px-1.5 py-0.5 rounded-full">
                    {activeChats.length}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* User Profile Section */}
        <div className="px-3 pb-4">
          <Link
            to="/profile"
            className="p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center
              text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            
            {/* Profile Tooltip */}
            <div className="
              absolute left-16 bg-gray-800 text-white px-2 py-1 rounded 
              text-sm whitespace-nowrap opacity-0 invisible
              group-hover:opacity-100 group-hover:visible
              transition-all duration-200 z-50
            ">
              {user?.name || 'Profile'}
              <div className="text-xs text-gray-400">{user?.role}</div>
            </div>
          </Link>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;