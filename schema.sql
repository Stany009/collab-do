-- Create the lists table
CREATE TABLE lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the list_shares table (for collaboration)
CREATE TABLE list_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(list_id, shared_with_email)
);

-- Create the tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for `lists`
-- Owners can read, update, and delete their own lists
CREATE POLICY "Users can manage their own lists" 
ON lists FOR ALL 
USING (auth.uid() = owner_id);

-- Users can read lists that are shared with their email
CREATE POLICY "Users can read shared lists" 
ON lists FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM list_shares 
    WHERE list_shares.list_id = lists.id 
    AND list_shares.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- RLS Policies for `tasks`
-- Users can manage tasks in lists they own or lists shared with them
CREATE POLICY "Users can manage tasks in accessible lists" 
ON tasks FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM lists 
    WHERE lists.id = tasks.list_id 
    AND (
      lists.owner_id = auth.uid() 
      OR 
      EXISTS (
        SELECT 1 FROM list_shares 
        WHERE list_shares.list_id = lists.id 
        AND list_shares.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  )
);

-- RLS Policies for `list_shares`
-- Only the owner of a list can share it
CREATE POLICY "Owners can manage shares" 
ON list_shares FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM lists 
    WHERE lists.id = list_shares.list_id 
    AND lists.owner_id = auth.uid()
  )
);

-- Users can see shares for lists they have access to
CREATE POLICY "Users can see shares for accessible lists" 
ON list_shares FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM lists 
    WHERE lists.id = list_shares.list_id 
    AND (
      lists.owner_id = auth.uid() 
      OR 
      list_shares.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can delete shares they own" ON public.list_shares
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_shares.list_id
            AND lists.owner_id = auth.uid()
        )
    );

-- Fix foreign key permission issue for inserting lists
GRANT SELECT ON auth.users TO authenticated;

-- Enable Realtime for all tables so clients can listen to changes
alter publication supabase_realtime add table lists;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table list_shares;
