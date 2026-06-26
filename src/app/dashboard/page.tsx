"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Plus, Trash2, Share2, LogOut, CheckCircle2, Circle, ListTodo, Users } from 'lucide-react';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

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
  const [theme, setTheme] = useState('light');
  
  const router = useRouter();
  const supabase = createClient();

  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const tasksContainerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Sidebar Scroll Pinning
    if (sidebarRef.current && window.innerWidth > 768) {
      ScrollTrigger.create({
        trigger: sidebarRef.current,
        start: 'top 120px',
        end: () => `+=${Math.max(0, (tasksContainerRef.current?.offsetHeight || 0) - sidebarRef.current!.offsetHeight)}`,
        pin: true,
        pinSpacing: false,
      });
    }

    // Task Card Stacking effect
    const cards = gsap.utils.toArray('.task-gsap-card');
    if (cards.length > 0) {
      gsap.fromTo(cards, 
        { opacity: 0, y: 30, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.05,
          ease: "power2.out",
          scrollTrigger: {
            trigger: tasksContainerRef.current,
            start: "top bottom-=100"
          }
        }
      );
    }
  }, { scope: containerRef, dependencies: [tasks, activeListId] });

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      const fetchLists = async () => {
        const { data } = await supabase
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => { fetchLists(); })
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `list_id=eq.${activeListId}` }, () => { fetchTasks(); })
      .subscribe();

    return () => { supabase.removeChannel(tasksSubscription); };
  }, [activeListId, supabase]);

  const fetchSharedUsers = async () => {
    if (!activeListId) return;
    const { data } = await supabase.from('list_shares').select('*').eq('list_id', activeListId);
    if (data) setSharedUsers(data);
  };

  useEffect(() => {
    if (isShareModalOpen) fetchSharedUsers();
  }, [isShareModalOpen, activeListId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !user) return;
    const { data, error } = await supabase.from('lists').insert([{ title: newListName, owner_id: user.id }]).select();
    if (error) alert(`Error creating list: ${error.message}`);
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
        if (error) alert("Error deleting list: " + error.message);
        else {
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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (!user) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="panel" style={{ padding: '2rem' }}>
          <h3 className="animate-pulse">Loading workspace...</h3>
        </div>
      </div>
    );
  }

  return (
    <main ref={containerRef} className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
      
      {/* Cinematic Center Hero Navbar */}
      <header className="flex-between animate-fade-in-up" style={{ padding: '1.5rem', marginBottom: '3rem', borderRadius: '24px', background: 'var(--panel-bg)', backdropFilter: 'blur(16px)', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ListTodo size={28} color="var(--accent-color)" />
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.03em' }}>CollabDo</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button 
                onClick={() => handleThemeChange('light')}
                className={`btn-ghost ${theme === 'light' ? 'active' : ''}`}
                style={{ padding: '0.5rem', borderRadius: '50%', background: theme === 'light' ? 'var(--border-color)' : 'transparent' }}
             >
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, #fbd3be, #fdf0e6)' }} />
             </button>
             <button 
                onClick={() => handleThemeChange('dark')}
                className={`btn-ghost ${theme === 'dark' ? 'active' : ''}`}
                style={{ padding: '0.5rem', borderRadius: '50%', background: theme === 'dark' ? 'var(--border-color)' : 'transparent' }}
             >
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, #111827, #0f1219)' }} />
             </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, opacity: 0.8 }}>{user.email}</span>
            <button onClick={handleSignOut} className="btn-ghost" style={{ padding: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogOut size={18} /> <span style={{ fontWeight: 600 }}>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Cinematic Center Title Area */}
      <div className="animate-fade-in-up delay-100 flex-center" style={{ flexDirection: 'column', textAlign: 'center', marginBottom: '5rem', padding: '0 2rem' }}>
        <h1 style={{ 
          fontSize: 'clamp(3rem, 5vw, 5.5rem)', 
          fontWeight: 700, 
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          maxWidth: '64rem',
          margin: '0 auto 1.5rem auto'
        }}>
          Organize your mind <span className="inline-block align-middle mx-3 bg-cover bg-center rounded-full" style={{ width: '100px', height: '48px', backgroundImage: 'url(https://picsum.photos/seed/productivity/400/200)', filter: 'grayscale(0.5) contrast(1.2)' }}></span> and collaborate.
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '42rem', lineHeight: 1.6 }}>
          A high-performance workspace engineered for focus, speed, and real-time synchronization.
        </p>
      </div>

      {/* Gapless Bento Grid Architecture */}
      <div className="bento-grid" style={{ alignItems: 'start' }}>
        
        {/* Sidebar: Lists (Col 4) */}
        <div ref={sidebarRef} className="panel animate-fade-in-up delay-200" style={{ gridColumn: 'span 4', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="flex-between">
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, letterSpacing: '0.02em' }}>
              Workspaces
            </h3>
            <button onClick={() => setIsCreatingList(!isCreatingList)} className="btn-ghost" style={{ padding: '0.5rem' }}>
              <Plus size={20} />
            </button>
          </div>
          
          {isCreatingList && (
            <form onSubmit={createList} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                autoFocus 
                value={newListName} 
                onChange={(e) => setNewListName(e.target.value)} 
                placeholder="Name your workspace..." 
                className="input-field"
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem' }}>
                <Plus size={18} />
              </button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lists.length === 0 && <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>No workspaces found.</p>}
            {lists.map(list => (
              <div key={list.id} className={`card ${activeListId === list.id ? 'active' : ''}`} style={{ display: 'flex', overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveListId(list.id)}
                  style={{
                    flex: 1, padding: '1rem 1.25rem', textAlign: 'left',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    background: 'transparent', border: 'none', color: 'inherit',
                    fontFamily: 'inherit', fontSize: '1rem', fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  {list.title} 
                  {list.owner_id !== user.id && <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Users size={12}/> Shared</span>}
                </button>
                {list.owner_id === user.id && (
                  <button onClick={() => deleteList(list.id)} className="btn-danger" style={{ padding: '0 1rem' }} title="Delete Workspace">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Tasks (Col 8) */}
        <div ref={tasksContainerRef} style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeListId ? (
            <>
              <div className="panel animate-fade-in-up delay-300" style={{ padding: '2rem' }}>
                <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
                    {lists.find(l => l.id === activeListId)?.title}
                  </h2>
                  
                  {lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                      <button 
                        onClick={() => setIsShareModalOpen(!isShareModalOpen)} 
                        className="btn btn-ghost"
                        style={{ border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Share2 size={18} /> {isShareModalOpen ? 'Hide Sharing' : 'Collaborate'}
                      </button>
                  )}
                </div>

                {/* Share List Modal/Panel */}
                {isShareModalOpen && lists.find(l => l.id === activeListId)?.owner_id === user.id && (
                  <div style={{ padding: '1.5rem', marginBottom: '2.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 600 }}>Invite Team Members</h3>
                    <form onSubmit={handleShareList} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <input 
                        type="email" 
                        required 
                        value={shareEmail} 
                        onChange={(e) => setShareEmail(e.target.value)} 
                        placeholder="colleague@example.com" 
                        className="input-field" 
                      />
                      <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Share2 size={18} /> Send Invite
                      </button>
                    </form>
                    
                    <div>
                      <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Collaborators:</p>
                      {sharedUsers.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No one invited yet.</span>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {sharedUsers.map(share => (
                          <div key={share.id} className="flex-between" style={{ padding: '0.75rem 1rem', background: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontWeight: 500 }}>{share.shared_with_email}</span>
                            <button onClick={() => handleRemoveShare(share.id)} className="btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Task Input */}
                <form onSubmit={addTask} style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    value={newTaskText} 
                    onChange={(e) => setNewTaskText(e.target.value)} 
                    placeholder="Type a new task..." 
                    className="input-field"
                    style={{ padding: '1.25rem', fontSize: '1.1rem', boxShadow: 'var(--shadow-sm)' }} 
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }}>
                    <Plus size={24} />
                  </button>
                </form>
              </div>

              {/* Task List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tasks.length === 0 && (
                  <div className="panel animate-fade-in-up delay-300" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.1rem' }}>Your workspace is clear. Add a task above to begin.</p>
                  </div>
                )}
                {tasks.map((task) => (
                  <div key={task.id} className="task-item panel task-gsap-card group" style={{ display: 'flex', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease' }}>
                    <button 
                      onClick={() => toggleTask(task.id, task.completed)}
                      className="btn-ghost"
                      style={{ padding: '0', marginRight: '1rem', color: task.completed ? 'var(--text-secondary)' : 'var(--accent-color)' }}
                    >
                      {task.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                    </button>
                    
                    <span className={`task-text ${task.persisted ? 'completed' : ''} ${task.completed ? 'completed' : ''}`} style={{ fontSize: '1.2rem', transition: 'all 0.3s ease' }}>
                      {task.text}
                    </span>
                    
                    <button 
                      onClick={() => deleteTask(task.id)} 
                      className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity" 
                      style={{ color: 'var(--danger)', padding: '0.5rem' }} 
                      title="Delete Task"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
             <div className="panel animate-fade-in-up delay-300 flex-center" style={{ minHeight: '50vh', color: 'var(--text-secondary)' }}>
              <div style={{ textAlign: 'center' }}>
                <ListTodo size={48} style={{ margin: '0 auto 1.5rem auto', opacity: 0.5 }} />
                <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>Select or create a workspace to begin.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
