/*--Overview
This README provides an overview of the SQL database schema, 
setup instructions, and usage guidelines for the project. 
The database is designed to store and manage data efficiently, 
ensuring data integrity and ease of access.
*/

--Database Schema
The database schema consists of the following tables:

--Create the following tables in Supabase:

-- Users table
create table users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password text not null,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Customers table
create table customers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  company text,
  assigned_to uuid references users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


--nexxt for the (Profiles page logic and all)

-- Add new columns to the users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add comments to the columns for better documentation
COMMENT ON COLUMN users.name IS 'The user''s full name';
COMMENT ON COLUMN users.phone IS 'The user''s phone number';
COMMENT ON COLUMN users.profile_picture IS 'URL to the user''s profile picture';

-- Update RLS (Row Level Security) policies to allow users to update their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Optional: Add constraints if needed
ALTER TABLE users
ADD CONSTRAINT phone_format 
CHECK (phone ~ '^\+?[0-9\-\(\)\s]*$'); -- Basic phone format validation



-----------------------------------------------------------------------------------

--Added new endpoints:
--/activities - to view activity history
--/sessions - to view login/logout history
--You'll need to create a new table in your Supabase database to store these activities. Here's the SQL for that:



create table user_activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  activity_type text not null,
  details jsonb default '{}',
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create index for faster queries
create index user_activities_user_id_idx on user_activities(user_id);
create index user_activities_activity_type_idx on user_activities(activity_type);

--------------------------------------------------------------------------------------
--4. campaigns table



-- First, create the trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then create the campaigns table
CREATE TABLE campaigns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  type text NOT NULL,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  target_audience jsonb DEFAULT '{}',
  filters jsonb DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Add indexes for better query performance
CREATE INDEX campaigns_status_idx ON campaigns(status);
CREATE INDEX campaigns_created_by_idx ON campaigns(created_by);
CREATE INDEX campaigns_start_date_idx ON campaigns(start_date);
CREATE INDEX campaigns_end_date_idx ON campaigns(end_date);

-- Finally, create the trigger
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();



---------------------------------------------------------------------------------------------
--5. nexxxt

-- Update customers table
CREATE TABLE IF NOT EXISTS customers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE,
    phone text,
    company text,
    industry text,
    location text,
    status text DEFAULT 'active',
    last_contact_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    notes text,
    tags text[],
    assigned_to uuid REFERENCES users(id),
    created_by uuid REFERENCES users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(location);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

---------------------------------------------------------------------------------------
--6. nexxxt

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    agent_id uuid REFERENCES users(id) ON DELETE SET NULL,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_customer ON chat_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_sessions
CREATE POLICY "Users can view their own chats"
    ON chat_sessions FOR SELECT
    USING (agent_id = auth.uid() OR customer_id IN (
        SELECT id FROM customers WHERE assigned_to = auth.uid()
    ));

CREATE POLICY "Users can create chats"
    ON chat_sessions FOR INSERT
    WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can update their own chats"
    ON chat_sessions FOR UPDATE
    USING (agent_id = auth.uid());

-- Create policies for chat_messages
CREATE POLICY "Users can view chat messages"
    ON chat_messages FOR SELECT
    USING (chat_id IN (
        SELECT id FROM chat_sessions WHERE agent_id = auth.uid()
    ));

CREATE POLICY "Users can create messages"
    ON chat_messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());



-----------------------------------------------------------------------------------
--7. nexxxt

-- 1. First, let's check and update the table structure
CREATE TABLE IF NOT EXISTS chat_sessions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
    agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Reset RLS policies
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for authenticated users" ON chat_sessions;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON chat_messages;

-- 3. Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create new policies for chat_sessions
CREATE POLICY "Enable insert for authenticated users"
    ON chat_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Enable select for authenticated users"
    ON chat_sessions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for chat owners"
    ON chat_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = agent_id);

-- 5. Create policies for chat_messages
CREATE POLICY "Enable insert for chat participants"
    ON chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_id AND 
            (agent_id = auth.uid())
        )
    );

CREATE POLICY "Enable select for chat participants"
    ON chat_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_id AND 
            (agent_id = auth.uid())
        )
    );

-- 6. Grant necessary permissions (removed sequence grants)
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON chat_messages TO authenticated;

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_customer_id ON chat_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent_id ON chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);


--------------------------------------------------------------------------------
--8. nexxxt


-- First, disable RLS for debugging
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Create a function to log authentication details
CREATE OR REPLACE FUNCTION debug_auth() 
RETURNS TABLE (
    "user_name" text,   -- Renamed to avoid conflict
    user_id uuid,
    is_authenticated boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CURRENT_USER::text,  -- Returns the current database user
        auth.uid()::uuid,    -- Returns the authenticated user's UID
        (auth.role() = 'authenticated')::boolean;
END;
$$;

-- Create a more permissive policy
CREATE POLICY "Allow all operations for authenticated users"
    ON chat_sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant explicit permissions
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON chat_messages TO authenticated;

-- Add a trigger for debugging inserts
CREATE OR REPLACE FUNCTION log_chat_session_insert()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'New chat session: %, Agent: %, Customer: %', 
        NEW.id, 
        NEW.agent_id, 
        NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_session_insert_trigger
    BEFORE INSERT ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION log_chat_session_insert();


-----------------------------------------------------------------------------------



--Contributing


--License

This project is licensed under the MIT License. See the LICENSE file for details.



