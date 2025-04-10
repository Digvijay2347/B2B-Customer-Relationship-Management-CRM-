import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';

const ChatWindow = ({ chatId, customerName, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { socket, sendMessage } = useChat();

  useEffect(() => {
    if (socket) {
      socket.on(`message`, (message) => {
        if (message.chatId === chatId) {
          setMessages(prev => [...prev, message]);
        }
      });

      socket.on('typing_start', ({ userId }) => {
        setIsTyping(true);
      });

      socket.on('typing_stop', ({ userId }) => {
        setIsTyping(false);
      });
    }
  }, [socket, chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(chatId, newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-[400px] w-[300px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-3 bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
        <span>{customerName}</span>
        <button onClick={onClose} className="text-white hover:text-gray-200">×</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-2 ${
              message.senderId === socket.id ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                message.senderId === socket.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="text-gray-500 text-sm">Customer is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;