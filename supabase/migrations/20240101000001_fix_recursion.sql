-- Drop the existing function in case parameter names changed, cascade to drop dependent policies
DROP FUNCTION IF EXISTS public.is_list_owner(uuid) CASCADE;

-- Create a security definer function to check list ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_list_owner(check_list_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lists 
    WHERE id = check_list_id 
    AND owner_id = auth.uid()
  );
$$;

-- Drop all policies that query 'lists' inside 'list_shares'
DROP POLICY IF EXISTS "Users can see shares for accessible lists" ON list_shares;
DROP POLICY IF EXISTS "Owners can manage shares" ON list_shares;
DROP POLICY IF EXISTS "Users can delete shares they own" ON list_shares;

-- Recreate them using the new function to break the recursion loop
CREATE POLICY "Users can see shares for accessible lists" 
ON list_shares FOR SELECT 
USING (
  shared_with_email = auth.jwt()->>'email'
  OR 
  public.is_list_owner(list_id)
);

CREATE POLICY "Owners can manage shares" 
ON list_shares FOR ALL 
USING (
  public.is_list_owner(list_id)
);
