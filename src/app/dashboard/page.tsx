"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  
  // Sharing States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      const fetchLists = async () => {
        const { data, error } = await supabase
          .from('lists')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (data) {
          setLists(data);
          if (data.length > 0 && !activeListId) {
            setActiveListId(data[0].id);
          }
        }
      };
      
      await fetchLists();

      const listsSubscription = supabase.channel('custom-all-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lists' },
          (payload) => { fetchLists(); }
        )
        .subscribe();

      return () => { supabase.removeChannel(listsSubscription); };
    };
    
    checkUserAndFetchData();
  }, [router, supabase, activeListId]);

  useEffect(() => {
    if (!activeListId) {
      setTasks([]);
      setSharedUsers([]);
      setIsShareModalOpen(false);
      return;
    }

    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('list_id', activeListId)
        .order('created_at', { ascending: true });
      if (data) setTasks(data);
    };

    fetchTasks();

    const tasksSubscription = supabase.channel(`tasks-${activeListId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `list_id=eq.${activeListId}` },
        (payload) => { fetchTasks(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(tasksSubscription); };
  }, [activeListId, supabase]);

  const fetchSharedUsers = async () => {
    if (!activeListId) return;
    const { data } = await supabase
      .from('list_shares')
      .select('*')
      .eq('list_id', activeListId);
    if (data) setSharedUsers(data);
  };

  useEffect(() => {
    if (isShareModalOpen) {
      fetchSharedUsers();
    }
  }, [isShareModalOpen, activeListId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !user) return;
    const { data } = await supabase.from('lists').insert([{ title: newListName, owner_id: user.id }]).select();
    if (data && data.length > 0) setActiveListId(data[0].id);
    setNewListName('');
    setIsCreatingList(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !activeListId) return;
    await supabase.from('tasks').insert([{ text: newTaskText, list_id: activeListId }]);
    setNewTaskText('');
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
  };
  
  const deleteList = async (listId: string) => {
    if (window.confirm("Are you sure you want to delete this list?")) {
        await supabase.from('lists').delete().eq('id', listId);
        if (activeListId === listId) setActiveListId(null);
    }
  }

  const handleShareList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim() || !activeListId) return;
    await supabase.from('list_shares').insert([{ list_id: activeListId, shared_with_email: shareEmail }]);
    setShareEmail('');
    fetchSharedUsers();
  };

  const handleRemoveShare = async (shareId: string) => {
    await supabase.from('list_shares').delete().eq('id', shareId);
    fetchSharedUsers();
  };

  if (!user) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--accent-color)' }}>CollabDo Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            onChange={(e) => document.documentElement.setAttribute('data-theme', e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--border-radius)',
              background: 'var(--task-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <option value="light">Light Theme</option>
            <option value="dark">Dark Theme</option>
            <option value="pastel">Pastel Theme</option>
            <option value="neon">Neon Theme</option>
          </select>
          <span style={{ fontSize: '0.875rem' }}>{user.email}</span>
          <button onClick={handleSignOut} style={{ padding: '0.5rem 1rem', background: 'var(--danger)', color: 'white', borderRadius: 'var(--border-radius)', fontWeight: 'bold' }}>
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', minHeight: '60vh' }}>
        {/* Sidebar: Lists */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>My Lists</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lists.map(list => (
              <div key={list.id} style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveListId(list.id)}
                  style={{
                    flex: 1, padding: '1rem', background: activeListId === list.id ? 'var(--accent-color)' : 'var(--task-bg)',
                    color: activeListId === list.id ? 'white' : 'var(--text-primary)', borderRadius: 'var(--border-radius)',
                    textAlign: 'left', boxShadow: 'var(--shadow-sm)', transition: 'background-color 0.2s ease',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                >
                  {list.title} {list.owner_id !== user.id && "(Shared)"}
                </button>
                {list.owner_id === user.id && (
                  <button onClick={() => deleteList(list.id)} style={{ padding: '0 0.5rem', color: 'var(--danger)', background: 'var(--task-bg)', borderRadius: 'var(--border-radius)' }}>
                    X
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {isCreatingList ? (
            <form onSubmit={createList} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" autoFocus value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="List name" style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' }} />
            </form>
          ) : (
            <button onClick={() => setIsCreatingList(true)} style={{ padding: '1rem', background: 'transparent', border: '2px dashed var(--border-color)', color: 'var(--text-secondary)', borderRadius: 'var(--border-radius)', fontWeight: 'bold' }}>
              + New List
            </button>
          )}
        </div>

        {/* Main Content: Tasks */}
        <div style={{ flex: 1, background: 'var(--task-bg)', padding: '2rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-md)', position: 'relative' }}>
          {activeListId ? (
            <>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                {lists.find(l => l.id === activeListId)?.title}
                {lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                    <button onClick={() => setIsShareModalOpen(!isShareModalOpen)} style={{ fontSize: '0.875rem', color: 'var(--accent-color)' }}>
                      {isShareModalOpen ? 'Close Share' : 'Share'}
                    </button>
                )}
              </h2>

              {isShareModalOpen && lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Share this list</h3>
                  <form onSubmit={handleShareList} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input type="email" required value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="Friend's email" style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                    <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--accent-color)', color: 'white', borderRadius: 'var(--border-radius)', fontWeight: 'bold' }}>Invite</button>
                  </form>
                  <div style={{ fontSize: '0.875rem' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Shared with:</p>
                    {sharedUsers.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No one yet.</span>}
                    {sharedUsers.map(share => (
                      <div key={share.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                        <span>{share.shared_with_email}</span>
                        <button onClick={() => handleRemoveShare(share.id)} style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={addTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="What needs to be done?" style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-color)', color: 'white', borderRadius: 'var(--border-radius)', fontWeight: 'bold' }}>Add</button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tasks.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No tasks yet.</p>}
                {tasks.map((task) => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                    <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id, task.completed)} style={{ marginRight: '1rem', width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                    <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{task.text}</span>
                    <button onClick={() => deleteTask(task.id)} style={{ color: 'var(--danger)' }}>Delete</button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Create or select a list to view tasks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
