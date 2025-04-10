import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { supabaseClient } from '../supabaseClient';

const Chat = () => {
  const { 
    activeChats, 
    messages, 
    startChat, 
    sendMessage, 
    fetchChatHistory,
    closeChat,
    isConnected,
    loading,
    error 
  } = useChat();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch customers
  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('customers')  // Changed from 'users' to 'customers'
          .select('*')
          // Removed role filter
          .order('name');

        if (error) throw error;
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer) => {
    const existingChat = activeChats.find(chat => chat.customer_id === customer.id);
    if (existingChat) {
      setSelectedChat(existingChat);
      fetchChatHistory(existingChat.id);
    } else {
      startChat(customer.id);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!selectedChat || !newMessage.trim()) return;
    
    sendMessage(selectedChat.id, newMessage.trim());
    setNewMessage('');
  };

  const handleCloseChat = () => {
    if (!selectedChat) return;
    closeChat(selectedChat.id);
    setSelectedChat(null);
  };

  if (loading || loadingCustomers) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Customers sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Customers</h2>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => handleCustomerSelect(customer)}
              className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedChat?.customer_id === customer.id ? 'bg-blue-50 border border-blue-200' : ''
              }`}
            >
              <div className="font-medium">{customer.name}</div>
              <div className="text-sm text-gray-500">{customer.email}</div>
              {activeChats.some(chat => chat.customer_id === customer.id) && (
                <div className="text-xs text-green-600 mt-1">Active Chat</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {customers.find(c => c.id === selectedChat.customer_id)?.name}
              </h3>
              <button
                onClick={handleCloseChat}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Close Chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages[selectedChat.id]?.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender_id === user.userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      message.sender_id === user.userId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!isConnected}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a customer to start messaging
          </div>
        )}
      </div>

      {/* Connection status */}
      <div className={`fixed bottom-4 left-4 px-4 py-2 rounded-lg text-sm ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      } text-white`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Error message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default Chat;