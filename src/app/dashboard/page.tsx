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
    const { data, error } = await supabase.from('lists').insert([{ title: newListName, owner_id: user.id }]).select();
    if (error) {
      console.error("Supabase Error:", error);
      alert(`Error creating list: ${error.message}`);
    }
    if (data && data.length > 0) setActiveListId(data[0].id);
    setNewListName('');
    setIsCreatingList(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !activeListId) return;
    const { error } = await supabase.from('tasks').insert([{ text: newTaskText, list_id: activeListId }]);
    if (error) alert("Error adding task: " + error.message);
    else {
      setNewTaskText('');
      const { data } = await supabase.from('tasks').select('*').eq('list_id', activeListId).order('created_at', { ascending: true });
      if (data) setTasks(data);
    }
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
    if (error) alert("Error updating task: " + error.message);
    else {
      const { data } = await supabase.from('tasks').select('*').eq('list_id', activeListId).order('created_at', { ascending: true });
      if (data) setTasks(data);
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) alert("Error deleting task: " + error.message);
    else {
      const { data } = await supabase.from('tasks').select('*').eq('list_id', activeListId).order('created_at', { ascending: true });
      if (data) setTasks(data);
    }
  };
  
  const deleteList = async (listId: string) => {
    if (window.confirm("Are you sure you want to delete this list?")) {
        const { error } = await supabase.from('lists').delete().eq('id', listId);
        if (error) {
            console.error("Delete list error:", error);
            alert("Error deleting list: " + error.message);
        } else {
            if (activeListId === listId) setActiveListId(null);
            const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: true });
            if (data) setLists(data);
        }
    }
  }

  const handleShareList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim() || !activeListId) return;
    const { error } = await supabase.from('list_shares').insert([{ list_id: activeListId, shared_with_email: shareEmail }]);
    if (error) alert("Error sharing list: " + error.message);
    else {
      setShareEmail('');
      fetchSharedUsers();
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    const { error } = await supabase.from('list_shares').delete().eq('id', shareId);
    if (error) alert("Error removing share: " + error.message);
    else fetchSharedUsers();
  };

  if (!user) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div style={{ padding: '2rem' }}>
          <h3>Loading workspace...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in-up">
      <header className="flex-between" style={{ padding: '1.5rem 0', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ margin: 0, fontWeight: 700 }}>CollabDo</h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            onChange={(e) => document.documentElement.setAttribute('data-theme', e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.4rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.9rem' }}>{user.email}</span>
            <button onClick={handleSignOut} className="btn-ghost" style={{ padding: 0, color: 'var(--danger)' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', minHeight: '70vh', alignItems: 'flex-start' }}>
        
        {/* Sidebar: Lists */}
        <div className="animate-fade-in-up delay-100" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            My Lists
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lists.length === 0 && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No lists created.</p>}
            {lists.map(list => (
              <div key={list.id} style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveListId(list.id)}
                  className={`card ${activeListId === list.id ? 'active' : ''}`}
                  style={{
                    flex: 1, padding: '0.75rem 1rem', textAlign: 'left',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                >
                  {list.title} {list.owner_id !== user.id && <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>(Shared)</span>}
                </button>
                {list.owner_id === user.id && (
                  <button onClick={() => deleteList(list.id)} className="btn-danger" title="Delete List">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {isCreatingList ? (
            <form onSubmit={createList} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                autoFocus 
                value={newListName} 
                onChange={(e) => setNewListName(e.target.value)} 
                placeholder="List name..." 
                className="input-field"
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem' }}>+</button>
            </form>
          ) : (
            <button onClick={() => setIsCreatingList(true)} className="btn-ghost" style={{ border: '1px dashed var(--border-color)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
              + New List
            </button>
          )}
        </div>

        {/* Main Content: Tasks */}
        <div className="animate-fade-in-up delay-200" style={{ flex: 1 }}>
          {activeListId ? (
            <>
              <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 600 }}>
                  {lists.find(l => l.id === activeListId)?.title}
                </h2>
                
                {lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                    <button 
                      onClick={() => setIsShareModalOpen(!isShareModalOpen)} 
                      className={isShareModalOpen ? "btn btn-primary" : "btn btn-ghost"}
                      style={{ border: '1px solid var(--border-color)' }}
                    >
                      {isShareModalOpen ? 'Close Share' : 'Share'}
                    </button>
                )}
              </div>

              {/* Share List Modal/Panel */}
              {isShareModalOpen && lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                <div className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Invite Collaborators</h3>
                  <form onSubmit={handleShareList} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <input 
                      type="email" 
                      required 
                      value={shareEmail} 
                      onChange={(e) => setShareEmail(e.target.value)} 
                      placeholder="Email address" 
                      className="input-field" 
                    />
                    <button type="submit" className="btn btn-primary">Invite</button>
                  </form>
                  
                  <div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Shared with:</p>
                    {sharedUsers.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No one yet.</span>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sharedUsers.map(share => (
                        <div key={share.id} className="flex-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span>{share.shared_with_email}</span>
                          <button onClick={() => handleRemoveShare(share.id)} className="btn-ghost" style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Task Input */}
              <form onSubmit={addTask} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <input 
                  type="text" 
                  value={newTaskText} 
                  onChange={(e) => setNewTaskText(e.target.value)} 
                  placeholder="What needs to be done?" 
                  className="input-field"
                  style={{ padding: '1rem' }} 
                />
                <button type="submit" className="btn btn-primary">Add Task</button>
              </form>

              {/* Task List */}
              <div className="panel" style={{ border: 'none', boxShadow: 'none' }}>
                {tasks.length === 0 && (
                  <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
                    <p>No tasks yet.</p>
                  </div>
                )}
                {tasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <input 
                      type="checkbox" 
                      checked={task.completed} 
                      onChange={() => toggleTask(task.id, task.completed)} 
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
             <div style={{ color: 'var(--text-secondary)' }}>
              <p>Select a list from the sidebar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
