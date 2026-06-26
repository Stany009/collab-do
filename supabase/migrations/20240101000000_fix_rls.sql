-- Drop ALL old policies to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own lists" ON lists;
DROP POLICY IF EXISTS "Users can read shared lists" ON lists;
DROP POLICY IF EXISTS "Users can manage tasks in accessible lists" ON tasks;
DROP POLICY IF EXISTS "Owners can manage shares" ON list_shares;
DROP POLICY IF EXISTS "Users can see shares for accessible lists" ON list_shares;
DROP POLICY IF EXISTS "Users can delete shares they own" ON list_shares;

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
    AND list_shares.shared_with_email = auth.jwt()->>'email'
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
        AND list_shares.shared_with_email = auth.jwt()->>'email'
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
      list_shares.shared_with_email = auth.jwt()->>'email'
    )
  )
);

CREATE POLICY "Users can delete shares they own" ON list_shares
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_shares.list_id
            AND lists.owner_id = auth.uid()
        )
    );
