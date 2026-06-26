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

  if (!user) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Loading your workspace...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <header className="glass-panel flex-between" style={{ padding: '1.25rem 2rem', marginBottom: '2rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: '0 0 24px 24px' }}>
        <h2 style={{ margin: 0, background: 'linear-gradient(to right, var(--accent-color), #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CollabDo
        </h2>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <select 
            onChange={(e) => document.documentElement.setAttribute('data-theme', e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '0.5rem 1rem', borderRadius: '99px' }}
          >
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
            <option value="pastel">Pastel Theme</option>
            <option value="neon">Neon Theme</option>
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '99px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.email}</span>
            <button onClick={handleSignOut} className="btn-ghost" style={{ padding: '0.2rem 0.5rem', color: 'var(--danger)' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', minHeight: '70vh', alignItems: 'flex-start' }}>
        
        {/* Sidebar: Lists */}
        <div className="glass-panel" style={{ width: '300px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            My Lists
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lists.length === 0 && <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>No lists created.</p>}
            {lists.map(list => (
              <div key={list.id} style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveListId(list.id)}
                  className={`glass-card ${activeListId === list.id ? 'active' : ''}`}
                  style={{
                    flex: 1, padding: '1rem', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                >
                  {list.title} {list.owner_id !== user.id && <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>(Shared)</span>}
                </button>
                {list.owner_id === user.id && (
                  <button onClick={() => deleteList(list.id)} className="btn-danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete List">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {isCreatingList ? (
            <form onSubmit={createList} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <input 
                type="text" 
                autoFocus 
                value={newListName} 
                onChange={(e) => setNewListName(e.target.value)} 
                placeholder="List name..." 
                className="input-field"
                style={{ padding: '0.75rem' }} 
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem' }}>+</button>
            </form>
          ) : (
            <button onClick={() => setIsCreatingList(true)} className="btn-ghost" style={{ border: '1px dashed var(--border-color)', padding: '1rem', marginTop: '1rem' }}>
              + Create New List
            </button>
          )}
        </div>

        {/* Main Content: Tasks */}
        <div className="glass-panel" style={{ flex: 1, padding: '2.5rem', position: 'relative' }}>
          {activeListId ? (
            <>
              <div className="flex-between" style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                  {lists.find(l => l.id === activeListId)?.title}
                </h2>
                
                {lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                    <button 
                      onClick={() => setIsShareModalOpen(!isShareModalOpen)} 
                      className="btn-ghost"
                      style={{ border: '1px solid var(--border-color)', background: isShareModalOpen ? 'var(--accent-color)' : 'transparent', color: isShareModalOpen ? 'white' : 'var(--text-primary)' }}
                    >
                      {isShareModalOpen ? 'Close Share' : 'Share List'}
                    </button>
                )}
              </div>

              {/* Share List Modal/Panel */}
              {isShareModalOpen && lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--accent-color)' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Invite Collaborators</h3>
                  <form onSubmit={handleShareList} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <input 
                      type="email" 
                      required 
                      value={shareEmail} 
                      onChange={(e) => setShareEmail(e.target.value)} 
                      placeholder="Friend's email address" 
                      className="input-field" 
                    />
                    <button type="submit" className="btn btn-primary">Invite</button>
                  </form>
                  
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Currently shared with:</p>
                    {sharedUsers.length === 0 && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No one yet.</span>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sharedUsers.map(share => (
                        <div key={share.id} className="flex-between" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                          <span style={{ fontWeight: 500 }}>{share.shared_with_email}</span>
                          <button onClick={() => handleRemoveShare(share.id)} className="btn-ghost" style={{ color: 'var(--danger)', padding: '0.2rem 0.5rem' }}>Remove Access</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Task Input */}
              <form onSubmit={addTask} style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                <input 
                  type="text" 
                  value={newTaskText} 
                  onChange={(e) => setNewTaskText(e.target.value)} 
                  placeholder="What needs to be done?" 
                  className="input-field"
                  style={{ padding: '1rem 1.5rem', fontSize: '1.1rem' }} 
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }}>Add Task</button>
              </form>

              {/* Task List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tasks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>All caught up!</h3>
                    <p>Add a task above to get started.</p>
                  </div>
                )}
                {tasks.map((task) => (
                  <div key={task.id} className="task-item animate-fade-in">
                    <input 
                      type="checkbox" 
                      checked={task.completed} 
                      onChange={() => toggleTask(task.id, task.completed)} 
                      className="checkbox-custom" 
                    />
                    <span className={`task-text ${task.completed ? 'completed' : ''}`}>
                      {task.text}
                    </span>
                    <button onClick={() => deleteTask(task.id)} className="btn-ghost" style={{ color: 'var(--danger)' }} title="Delete Task">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '3rem', opacity: 0.5 }}>📝</div>
              <h3>Select a list to start collaborating</h3>
              <p>Or create a new one from the sidebar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
