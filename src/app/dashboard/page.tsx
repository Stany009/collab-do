"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Share2, LogOut, CheckCircle2, Circle, ListTodo, Users, ChevronDown, Palette } from 'lucide-react';

const THEMES = [
  { id: 'hello-kitty', name: 'Hello Kitty', emoji: '🎀', color: 'linear-gradient(135deg, #ffe0ec, #fce4ec)', group: 'cute' },
  { id: 'lavender', name: 'Lavender Dream', emoji: '💜', color: 'linear-gradient(135deg, #e8d5f5, #ede7f6)', group: 'cute' },
  { id: 'bubblegum', name: 'Bubblegum Pop', emoji: '🍬', color: 'linear-gradient(135deg, #f8bbd0, #f3e5f5)', group: 'cute' },
  { id: 'dark', name: 'Midnight', emoji: '✨', color: 'linear-gradient(135deg, #111827, #1f2937)', group: 'minimal' },
  { id: 'ink', name: 'Ink', emoji: '🖋️', color: '#000000', group: 'minimal' },
  { id: 'snow', name: 'Snow', emoji: '❄️', color: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', group: 'minimal' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', color: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', group: 'minimal' },
];

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  const [theme, setTheme] = useState('dark');
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const themeRef = useRef<HTMLDivElement>(null);

  // Theme initialization
  useEffect(() => {
    const saved = localStorage.getItem('collabdo-theme');
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  // Close theme dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('collabdo-theme', newTheme);
    setIsThemeOpen(false);
  };

  // --- Data fetching ---
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser(session.user);

      const fetchLists = async () => {
        const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: true });
        if (data) {
          setLists(data);
          if (data.length > 0 && !activeListId) setActiveListId(data[0].id);
        }
      };
      await fetchLists();

      const sub = supabase.channel('lists-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => fetchLists())
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    };
    checkUserAndFetchData();
  }, [router, supabase, activeListId]);

  useEffect(() => {
    if (!activeListId) { setTasks([]); setSharedUsers([]); setIsShareModalOpen(false); return; }
    const fetchTasks = async () => {
      const { data } = await supabase.from('tasks').select('*').eq('list_id', activeListId).order('created_at', { ascending: true });
      if (data) setTasks(data);
    };
    fetchTasks();
    const sub = supabase.channel(`tasks-${activeListId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `list_id=eq.${activeListId}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeListId, supabase]);

  const fetchSharedUsers = async () => {
    if (!activeListId) return;
    const { data } = await supabase.from('list_shares').select('*').eq('list_id', activeListId);
    if (data) setSharedUsers(data);
  };

  useEffect(() => {
    if (isShareModalOpen) fetchSharedUsers();
  }, [isShareModalOpen, activeListId]);

  // --- Actions ---
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/'); };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !user) return;
    const { data, error } = await supabase.from('lists').insert([{ title: newListName, owner_id: user.id }]).select();
    if (error) alert(`Error: ${error.message}`);
    if (data && data.length > 0) setActiveListId(data[0].id);
    setNewListName('');
    setIsCreatingList(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !activeListId) return;
    const { error } = await supabase.from('tasks').insert([{ text: newTaskText, list_id: activeListId }]);
    if (error) alert("Error: " + error.message);
    else {
      setNewTaskText('');
      const { data } = await supabase.from('tasks').select('*').eq('list_id', activeListId).order('created_at', { ascending: true });
      if (data) setTasks(data);
    }
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
    if (error) alert("Error: " + error.message);
    else {
      const { data } = await supabase.from('tasks').select('*').eq('list_id', activeListId).order('created_at', { ascending: true });
      if (data) setTasks(data);
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) alert("Error: " + error.message);
    else {
      const { data } = await supabase.from('tasks').select('*').eq('list_id', activeListId).order('created_at', { ascending: true });
      if (data) setTasks(data);
    }
  };

  const deleteList = async (listId: string) => {
    if (!window.confirm("Delete this list and all its tasks?")) return;
    const { error } = await supabase.from('lists').delete().eq('id', listId);
    if (error) alert("Error: " + error.message);
    else {
      if (activeListId === listId) setActiveListId(null);
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: true });
      if (data) setLists(data);
    }
  };

  const handleShareList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim() || !activeListId) return;
    const { error } = await supabase.from('list_shares').insert([{ list_id: activeListId, shared_with_email: shareEmail }]);
    if (error) alert("Error: " + error.message);
    else { setShareEmail(''); fetchSharedUsers(); }
  };

  const handleRemoveShare = async (shareId: string) => {
    const { error } = await supabase.from('list_shares').delete().eq('id', shareId);
    if (error) alert("Error: " + error.message);
    else fetchSharedUsers();
  };

  // --- Derived state ---
  const activeList = lists.find(l => l.id === activeListId);
  const isOwner = activeList?.owner_id === user?.id;
  const currentTheme = THEMES.find(t => t.id === theme);
  const completedCount = tasks.filter(t => t.completed).length;

  if (!user) {
    return (
      <div className="page-center">
        <div className="glass" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--text-2)' }}>Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <nav className="navbar anim-fade">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ListTodo size={22} color="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-playfair), Georgia, serif' }}>CollabDo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          
          {/* Theme Dropdown */}
          <div ref={themeRef} style={{ position: 'relative' }}>
            <button className="theme-trigger" onClick={() => setIsThemeOpen(!isThemeOpen)}>
              <Palette size={14} />
              <span>{currentTheme?.emoji} {currentTheme?.name}</span>
              <ChevronDown size={12} style={{ transform: isThemeOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>
            
            {isThemeOpen && (
              <div className="theme-dropdown">
                <div className="theme-dropdown-label">Cute</div>
                {THEMES.filter(t => t.group === 'cute').map(t => (
                  <button key={t.id} className={`theme-option ${theme === t.id ? 'active' : ''}`} onClick={() => handleThemeChange(t.id)}>
                    <div className="theme-dot" style={{ background: t.color }} />
                    <span>{t.emoji} {t.name}</span>
                  </button>
                ))}
                <div className="theme-divider" />
                <div className="theme-dropdown-label">Minimal</div>
                {THEMES.filter(t => t.group === 'minimal').map(t => (
                  <button key={t.id} className={`theme-option ${theme === t.id ? 'active' : ''}`} onClick={() => handleThemeChange(t.id)}>
                    <div className="theme-dot" style={{ background: t.color }} />
                    <span>{t.emoji} {t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={14} /> {user.email}
          </span>
          
          <button onClick={handleSignOut} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            <LogOut size={16} /> Exit
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="anim-fade anim-d1" style={{ textAlign: 'center', margin: '3rem 0 4rem' }}>
        <h1 className="hero-text" style={{ marginBottom: '1rem' }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          Organize your tasks, collaborate with your team, and get things done in style.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="bento-grid flex-1">
        
        {/* --- LEFT COLUMN: WORKSPACES --- */}
        <div className="glass anim-fade anim-d2" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Workspaces</h2>
            <button onClick={() => setIsCreatingList(!isCreatingList)} className="btn-ghost" style={{ padding: '0.4rem', borderRadius: '8px' }}>
              <Plus size={18} />
            </button>
          </div>

          {isCreatingList && (
            <form onSubmit={createList} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New workspace..."
                className="input"
                style={{ fontSize: '0.9rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 0.75rem' }}>
                <Plus size={16} />
              </button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
            {lists.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-3)' }}>
                <p style={{ fontSize: '0.9rem' }}>No workspaces found.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Create one to get started.</p>
              </div>
            )}
            {lists.map(list => (
              <div key={list.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  onClick={() => setActiveListId(list.id)}
                  className={`list-item ${activeListId === list.id ? 'active' : ''}`}
                >
                  <ListTodo size={16} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{list.title}</span>
                  {list.owner_id !== user.id && <Users size={12} style={{ opacity: 0.5 }} />}
                </button>
                {list.owner_id === user.id && (
                  <button onClick={() => deleteList(list.id)} className="btn-danger-ghost" title="Delete">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Tasks */}
        <div className="glass anim-fade anim-d3" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
          {activeListId && activeList ? (
            <>
              {/* List Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {activeList.title}
                  </h1>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.95rem' }}>
                    {tasks.length} tasks · {completedCount} completed
                  </p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setIsShareModalOpen(!isShareModalOpen)}
                    className="btn btn-ghost"
                    style={{ border: '1px solid var(--surface-border)', gap: '0.5rem', fontSize: '0.9rem' }}
                  >
                    <Share2 size={16} /> {isShareModalOpen ? 'Hide Sharing' : 'Share'}
                  </button>
                )}
              </div>

              {/* Share Panel */}
              {isShareModalOpen && isOwner && (
                <div className="share-panel">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-inter), sans-serif' }}>Invite Collaborators</h3>
                  <form onSubmit={handleShareList} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <input
                      type="email"
                      required
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="input"
                    />
                    <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                      <Share2 size={16} /> Send Invite
                    </button>
                  </form>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Current Collaborators</h4>
                    {sharedUsers.length > 0 ? sharedUsers.map(share => (
                      <div key={share.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--surface-hover)', borderRadius: '10px', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 500 }}>{share.shared_with_email}</span>
                        <button onClick={() => handleRemoveShare(share.id)} className="btn-ghost" style={{ color: 'var(--danger)', padding: '0.3rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )) : (
                      <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', fontStyle: 'italic' }}>Only you have access right now.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Task Input */}
              <form onSubmit={addTask} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="What needs to be done?"
                  className="input input-lg"
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>
                  <Plus size={24} />
                </button>
              </form>

              {/* Tasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', paddingRight: '0.5rem', flex: 1 }}>
                {tasks.length === 0 && (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-3)' }}>
                    <Circle size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>This workspace is empty</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Add your first task above to get started.</p>
                  </div>
                )}
                {tasks.map((task) => (
                  <div key={task.id} className="task-card group">
                    <button
                      onClick={() => toggleTask(task.id, task.completed)}
                      className={`task-check ${task.completed ? 'checked' : ''}`}
                    >
                      {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <span className={`task-label ${task.completed ? 'done' : ''}`}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="btn-danger-ghost"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
              <ListTodo size={64} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>No Workspace Selected</h2>
              <p style={{ fontSize: '1rem' }}>Choose a workspace from the sidebar or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
