const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const initializeChat = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });

  // Authentication middleware
  // Update the authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      userId: decoded.sub || decoded.user_id || decoded.userId, // Handle different token formats
      email: decoded.email
    };
    console.log('Socket authenticated for user:', socket.user);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
  }
});

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.userId}`);

    // Join user to their own room
    socket.join(socket.user.userId);

    // Handle starting a new chat
    // Update the start_chat handler
// Update the start_chat handler
socket.on('start_chat', async ({ customerId }) => {
  try {
    console.log('Starting chat for customer:', customerId);
    console.log('Agent ID:', socket.user.userId);

    // First verify the customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    // Create new chat session with explicit agent_id
    const { data: chat, error: insertError } = await supabase
      .from('chat_sessions')
      .insert({
        customer_id: customerId,
        agent_id: socket.user.userId,
        status: 'active'
      })
      .select(`
        id,
        customer_id,
        agent_id,
        status,
        created_at,
        updated_at,
        customers (
          id,
          name,
          email
        )
      `)
      .single();

    if (insertError) {
      console.error('Chat creation error:', insertError);
      throw new Error(`Failed to create chat session: ${insertError.message}`);
    }

    console.log('Created new chat:', chat);
    socket.join(chat.id);
    socket.emit('chat_started', {
      id: chat.id,
      customer_id: chat.customer_id,
      agent_id: chat.agent_id,
      status: chat.status,
      created_at: chat.created_at,
      customer: chat.customers
    });

  } catch (error) {
    console.error('Detailed error in start_chat:', error);
    socket.emit('error', {
      message: 'Failed to start chat: ' + error.message,
      details: error
    });
  }
});

    // Handle sending messages
    socket.on('message', async ({ chatId, content }) => {
      try {
        console.log('Sending message in chat:', chatId);

        // Verify user has access to this chat
        const { data: chat, error: chatError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', chatId)
          .single();

        if (chatError) {
          console.error('Chat verification error:', chatError);
          throw new Error('Chat not found or access denied');
        }

        // Create the message
        const { data: message, error: messageError } = await supabase
          .from('chat_messages')
          .insert([
            {
              chat_id: chatId,
              sender_id: socket.user.userId,
              content
            }
          ])
          .select(`
            *,
            sender:users(id, name, email)
          `)
          .single();

        if (messageError) {
          console.error('Message creation error:', messageError);
          throw messageError;
        }

        console.log('Message created:', message);

        // Broadcast message to all users in the chat room
        io.to(chatId).emit('message', message);

        // Update chat session's updated_at timestamp
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', {
          message: 'Failed to send message: ' + error.message,
          details: error
        });
      }
    });

    // Handle fetching chat history
    socket.on('fetch_chat_history', async ({ chatId }) => {
      try {
        console.log('Fetching chat history for:', chatId);

        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            sender:users(id, name, email)
          `)
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Chat history fetch error:', error);
          throw error;
        }

        console.log(`Found ${messages.length} messages for chat:`, chatId);
        socket.emit('chat_history', { chatId, messages });

      } catch (error) {
        console.error('Error fetching chat history:', error);
        socket.emit('error', {
          message: 'Failed to fetch chat history: ' + error.message,
          details: error
        });
      }
    });

    // Handle closing a chat
    socket.on('close_chat', async ({ chatId }) => {
      try {
        console.log('Closing chat:', chatId);

        const { error } = await supabase
          .from('chat_sessions')
          .update({
            status: 'closed',
            updated_at: new Date().toISOString()
          })
          .eq('id', chatId);

        if (error) {
          console.error('Chat closing error:', error);
          throw error;
        }

        console.log('Chat closed successfully:', chatId);

        // Notify all users in the chat room
        io.to(chatId).emit('chat_closed', { chatId });

        // Remove all users from the room
        const room = io.sockets.adapter.rooms.get(chatId);
        if (room) {
          for (const clientId of room) {
            io.sockets.sockets.get(clientId).leave(chatId);
          }
        }

      } catch (error) {
        console.error('Error closing chat:', error);
        socket.emit('error', {
          message: 'Failed to close chat: ' + error.message,
          details: error
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.userId}`);
    });
  });

  return io;
};

module.exports = { initializeChat };