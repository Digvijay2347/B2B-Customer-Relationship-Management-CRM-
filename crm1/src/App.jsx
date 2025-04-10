// App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Users from './pages/Users';
import Layout from './components/Layout';
import Profile from './pages/Profile';
import Activities from './pages/Activities';
import Campaigns from './pages/Campaigns';
import CampaignCreate from './pages/CampaignCreate';
import Workflows from './pages/Workflows';
import WorkflowCreate from './pages/WorkflowCreate';
import Chat from './pages/chat';
import Messages from './components/Messages'; 
import Calendar from './components/Calender';
import Pipeline from './components/Pipeline';
import DealForm from './components/DealForm';
import DealView from './components/DealView';

const App = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<PrivateRoutes />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="customers" element={<Customers />} />
                <Route path="users" element={<Users />} />
                <Route path="profile" element={<Profile />} />
                <Route path="activities" element={<Activities />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="campaigns/create" element={<CampaignCreate />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="workflows/create" element={<WorkflowCreate />} />
                <Route path="chat" element={<Chat />} />
                <Route path="messages" element={<Messages />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="pipeline">
                  <Route index element={<Pipeline />} />
                  <Route path="deals">
                    <Route path="new" element={<DealForm />} />
                    <Route path=":id" element={<DealView />} />
                    <Route path=":id/edit" element={<DealForm />} />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
};

const PrivateRoutes = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default App;