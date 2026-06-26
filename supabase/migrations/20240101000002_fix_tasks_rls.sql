-- Create a security definer function to check if a user has access to a list (owner or shared)
CREATE OR REPLACE FUNCTION public.has_list_access(check_list_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lists 
    WHERE id = check_list_id 
    AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM list_shares
    WHERE list_id = check_list_id
    AND shared_with_email = auth.jwt()->>'email'
  );
$$;

-- Drop existing complex policies for tasks
DROP POLICY IF EXISTS "Users can manage tasks in accessible lists" ON tasks;

-- Recreate task policy using the new security definer function
CREATE POLICY "Users can manage tasks in accessible lists" 
ON tasks FOR ALL 
USING (
  public.has_list_access(list_id)
);

-- Also simplify lists SELECT policy to avoid any potential recursion or missing rows
DROP POLICY IF EXISTS "Users can read shared lists" ON lists;
DROP POLICY IF EXISTS "Users can manage their own lists" ON lists;

-- Single unified policy for reading lists
CREATE POLICY "Users can see accessible lists"
ON lists FOR SELECT
USING (
  public.has_list_access(id)
);

-- Owners can still manage their own lists (UPDATE, DELETE)
CREATE POLICY "Users can manage their own lists"
ON lists FOR ALL
USING (
  owner_id = auth.uid()
);
