import React from 'react';
import { useChat } from '../contexts/ChatContext';
import ChatWindow from '../components/ChatWindow';

const ChatManager = () => {
  const { activeChats, pendingChats } = useChat();

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-4">
      {/* Pending Chats Indicator */}
      {pendingChats.length > 0 && (
        <div className="bg-yellow-100 p-3 rounded-lg shadow">
          {pendingChats.length} pending chat(s)
        </div>
      )}

      {/* Active Chat Windows */}
      <div className="flex gap-4">
        {activeChats.map((chat) => (
          <ChatWindow
            key={chat.chatId}
            chatId={chat.chatId}
            customerName={chat.customerData?.name || 'Customer'}
            onClose={() => {/* Implement close chat logic */}}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatManager;