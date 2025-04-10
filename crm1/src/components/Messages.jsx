import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

const Messages = () => {
  const { 
    activeChats, 
    messages, 
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
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Filter chats based on search term
  const filteredChats = activeChats.filter(chat => 
    chat.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    fetchChatHistory(chat.id);
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Active chats sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Active Chats</h2>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => handleChatSelect(chat)}
              className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedChat?.id === chat.id ? 'bg-blue-50 border border-blue-200' : ''
              }`}
            >
              <div className="font-medium">{chat.customer?.name}</div>
              <div className="text-sm text-gray-500">{chat.customer?.email}</div>
              <div className="text-xs text-gray-400 mt-1">
                Started: {new Date(chat.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <div className="text-center text-gray-500 mt-4">
              No active chats found
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{selectedChat.customer?.name}</h3>
                <p className="text-sm text-gray-500">{selectedChat.customer?.email}</p>
              </div>
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
            Select a chat to view messages
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

export default Messages;