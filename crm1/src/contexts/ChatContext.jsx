import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { supabaseClient } from '../supabaseClient';

const ChatContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [activeChats, setActiveChats] = useState([]);
  const [messages, setMessages] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        console.log('Fetching customers...');
        const { data, error } = await supabaseClient
          .from('customers')
          .select('*')
          .order('name');

        if (error) throw error;
        
        console.log('Fetched customers:', data);
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setError('Failed to fetch customers: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchCustomers();
    }
  }, [user]);

  // Initialize socket connection
  useEffect(() => {
    if (!user || !token) {
      console.log('Missing user or token:', { user, token });
      return;
    }
  
    console.log('User details:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
  
    const newSocket = io(API_URL, {
      auth: { 
        token,
        userId: user.id
      },
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to chat server: ' + error.message);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'An unknown error occurred');
    });

    newSocket.on('chat_started', (chat) => {
      console.log('Chat started:', chat);
      setActiveChats(prev => {
        const exists = prev.some(c => c.id === chat.id);
        if (exists) return prev;
        return [...prev, chat];
      });
    });

    newSocket.on('message', (message) => {
      console.log('New message received:', message);
      setMessages(prev => ({
        ...prev,
        [message.chat_id]: [...(prev[message.chat_id] || []), message]
      }));
    });

    newSocket.on('chat_history', ({ chatId, messages: chatMessages }) => {
      console.log('Received chat history for:', chatId);
      setMessages(prev => ({
        ...prev,
        [chatId]: chatMessages
      }));
    });

    newSocket.on('chat_closed', ({ chatId }) => {
      console.log('Chat closed:', chatId);
      setActiveChats(prev => prev.filter(chat => chat.id !== chatId));
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[chatId];
        return newMessages;
      });
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection...');
      newSocket.close();
    };
  }, [user, token]);

  const startChat = async (customerId) => {
    if (!socket?.connected) {
      setError('Not connected to chat server');
      return;
    }
    try {
      console.log('Starting chat...', {
        customerId,
        userId: user.id,
        socketConnected: socket.connected
      });
      
      socket.emit('start_chat', { customerId });
    } catch (error) {
      console.error('Error starting chat:', error);
      setError('Failed to start chat: ' + (error.message || 'Unknown error'));
    }
  };

  const sendMessage = (chatId, content) => {
    if (!socket?.connected || !chatId) {
      setError('Cannot send message: Not connected or invalid chat');
      return;
    }
    try {
      console.log('Sending message to chat:', chatId);
      socket.emit('message', { chatId, content });
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message: ' + error.message);
    }
  };

  const fetchChatHistory = (chatId) => {
    if (!socket?.connected) {
      setError('Not connected to chat server');
      return;
    }
    try {
      console.log('Fetching chat history for:', chatId);
      socket.emit('fetch_chat_history', { chatId });
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setError('Failed to fetch chat history: ' + error.message);
    }
  };

  const closeChat = (chatId) => {
    if (!socket?.connected) {
      setError('Not connected to chat server');
      return;
    }
    try {
      console.log('Closing chat:', chatId);
      socket.emit('close_chat', { chatId });
    } catch (error) {
      console.error('Error closing chat:', error);
      setError('Failed to close chat: ' + error.message);
    }
  };

  const value = {
    isConnected,
    error,
    loading,
    activeChats,
    messages,
    customers,
    startChat,
    sendMessage,
    fetchChatHistory,
    closeChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;