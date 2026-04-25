import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FlagIcon,
  UsersIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  XMarkIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase';
import Avatar from '../components/shared/Avatar';
import Modal from '../components/shared/Modal';
import { toast } from '../components/shared/Toast';

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4'>
      <div className='flex-shrink-0 bg-navy-50 text-navy-600 rounded-lg p-2'>
        <Icon className='w-6 h-6' />
      </div>
      <div>
        <p className='text-2xl font-bold text-gray-900'>{value}</p>
        <p className='text-sm text-gray-500'>{label}</p>
      </div>
    </div>
  );
}

function ReasonBadge({ reason }) {
  const styles = {
    spam: 'bg-gray-100 text-gray-700',
    hateful: 'bg-red-100 text-red-700',
    misinformation: 'bg-orange-100 text-orange-700',
    violates_values: 'bg-purple-100 text-purple-700',
    other: 'bg-gray-100 text-gray-700',
  };
  const labels = {
    spam: 'Spam',
    hateful: 'Hateful',
    misinformation: 'Misinformation',
    violates_values: 'Violates Values',
    other: 'Other',
  };
  const cls = styles[reason] || styles.other;
  const label = labels[reason] || reason;
  return (
    <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + cls}>
      {label}
    </span>
  );
}

export default function AdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ users: 0, postsToday: 0, openFlags: 0, parishes: 0 });
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [banTarget, setBanTarget] = useState(null);
  const [banFlagId, setBanFlagId] = useState(null);
  const [banInput, setBanInput] = useState('');
  const [banModalOpen, setBanModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'Platform Admin | Communio';
  }, []);

  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadStats();
    loadFlaggedPosts();
  }, [profile]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    const timer = setTimeout(() => {
      loadRecentUsers(userSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [userSearch, profile]);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [usersRes, postsRes, flagsRes, parishesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayIso),
        supabase
          .from('post_flags')
          .select('id', { count: 'exact', head: true })
          .eq('is_resolved', false),
        supabase
          .from('parishes')
          .select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersRes.count ?? 0,
        postsToday: postsRes.count ?? 0,
        openFlags: flagsRes.count ?? 0,
        parishes: parishesRes.count ?? 0,
      });
    } catch (err) {
      toast.error('Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadFlaggedPosts() {
    setLoadingFlags(true);
    try {
      const { data, error } = await supabase
        .from('post_flags')
        .select(
          'id, reason, created_at, post:posts!post_id(id, content, image_url, created_at, author:profiles!author_id(id, full_name, avatar_url)), reporter:profiles!user_id(id, full_name)'
        )
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlaggedPosts(data || []);
    } catch (err) {
      toast.error('Failed to load flagged posts');
    } finally {
      setLoadingFlags(false);
    }
  }

  const loadRecentUsers = useCallback(async (search) => {
    setLoadingUsers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, suspended_at, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (search && search.trim()) {
        query = query.ilike('full_name', '%' + search.trim() + '%');
      } else {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setRecentUsers(data || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  async function dismissFlag(flagId) {
    try {
      const { error } = await supabase
        .from('post_flags')
        .update({
          is_resolved: true,
          resolved_by: profile.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', flagId);
      if (error) throw error;
      toast.success('Flag dismissed');
      setFlaggedPosts((prev) => prev.filter((f) => f.id !== flagId));
      setStats((prev) => ({ ...prev, openFlags: Math.max(0, prev.openFlags - 1) }));
    } catch (err) {
      toast.error('Failed to dismiss flag');
    }
  }

  async function hidePost(flagId, postId) {
    try {
      const { error: postError } = await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId);
      if (postError) throw postError;

      await dismissFlag(flagId);
      toast.success('Post hidden');
    } catch (err) {
      toast.error('Failed to hide post');
    }
  }

  function openBanModal(flagId, user) {
    setBanFlagId(flagId);
    setBanTarget(user);
    setBanInput('');
    setBanModalOpen(true);
  }

  async function banUser() {
    if (banInput !== 'BAN') {
      toast.error('Type BAN to confirm');
      return;
    }
    try {
      const { error: banError } = await supabase
        .from('profiles')
        .update({ suspended_at: new Date().toISOString() })
        .eq('id', banTarget.id);
      if (banError) throw banError;

      if (banFlagId) {
        await dismissFlag(banFlagId);
      }

      toast.success('User suspended');
      setBanModalOpen(false);
      setBanTarget(null);
      setBanFlagId(null);
      setBanInput('');
      loadRecentUsers(userSearch);
    } catch (err) {
      toast.error('Failed to suspend user');
    }
  }

  async function toggleSuspend(user) {
    try {
      const newValue = user.suspended_at ? null : new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ suspended_at: newValue })
        .eq('id', user.id);
      if (error) throw error;
      toast.success(newValue ? 'User suspended' : 'User reinstated');
      setRecentUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, suspended_at: newValue } : u))
      );
    } catch (err) {
      toast.error('Failed to update user status');
    }
  }

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Top bar */}
      <div className='bg-navy-800 text-white px-4 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <ShieldExclamationIcon className='w-5 h-5' />
          <span className='font-semibold text-lg'>Platform Admin</span>
        </div>
        <Link
          to='/'
          className='text-sm text-navy-200 hover:text-white transition-colors flex items-center gap-1'
        >
          <XMarkIcon className='w-4 h-4' />
          Back to app
        </Link>
      </div>

      <div className='max-w-3xl mx-auto px-4 pt-6 pb-16 space-y-8'>
        {/* Stats */}
        <section>
          <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3'>
            Overview
          </h2>
          {loadingStats ? (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-pulse h-20' />
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <StatCard label='Total Users' value={stats.users} icon={UsersIcon} />
              <StatCard label='Posts Today' value={stats.postsToday} icon={DocumentTextIcon} />
              <StatCard label='Open Flags' value={stats.openFlags} icon={FlagIcon} />
              <StatCard label='Parishes' value={stats.parishes} icon={BuildingLibraryIcon} />
            </div>
          )}
        </section>

        {/* Flagged Posts */}
        <section>
          <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2'>
            <FlagIcon className='w-4 h-4 text-red-500' />
            Flagged Posts
          </h2>
          {loadingFlags ? (
            <div className='space-y-3'>
              {[0, 1, 2].map((i) => (
                <div key={i} className='bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse h-28' />
              ))}
            </div>
          ) : flaggedPosts.length === 0 ? (
            <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm'>
              No open flags — great job!
            </div>
          ) : (
            <div className='space-y-3'>
              {flaggedPosts.map((flag) => {
                const post = flag.post;
                const author = post?.author;
                const reporter = flag.reporter;
                return (
                  <div
                    key={flag.id}
                    className='bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-400 p-4'
                  >
                    <div className='flex items-start justify-between gap-3 mb-2'>
                      <div className='flex items-center gap-2 min-w-0'>
                        {author && (
                          <Avatar
                            src={author.avatar_url}
                            name={author.full_name}
                            size='sm'
                          />
                        )}
                        <div className='min-w-0'>
                          <p className='text-sm font-medium text-gray-900 truncate'>
                            {author?.full_name || 'Unknown user'}
                          </p>
                          <p className='text-xs text-gray-400'>
                            Reported by {reporter?.full_name || 'unknown'}
                          </p>
                        </div>
                      </div>
                      <ReasonBadge reason={flag.reason} />
                    </div>

                    {post?.content && (
                      <p className='text-sm text-gray-700 mb-3 line-clamp-3'>{post.content}</p>
                    )}

                    {post?.image_url && (
                      <img
                        src={post.image_url}
                        alt='Post image'
                        className='rounded-lg mb-3 max-h-40 object-cover'
                      />
                    )}

                    <div className='flex flex-wrap gap-2'>
                      <button
                        onClick={() => dismissFlag(flag.id)}
                        className='text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
                      >
                        Dismiss
                      </button>
                      {post && (
                        <button
                          onClick={() => hidePost(flag.id, post.id)}
                          className='text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors'
                        >
                          Hide Post
                        </button>
                      )}
                      {author && (
                        <button
                          onClick={() => openBanModal(flag.id, author)}
                          className='text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors'
                        >
                          Suspend Author
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Users */}
        <section>
          <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2'>
            <UsersIcon className='w-4 h-4' />
            Users
          </h2>

          <div className='relative mb-3'>
            <MagnifyingGlassIcon className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              placeholder='Search by name...'
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className='w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white'
            />
          </div>

          {loadingUsers ? (
            <div className='space-y-2'>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className='bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse h-14' />
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm'>
              {userSearch ? 'No users match that search.' : 'No new users in the last 7 days.'}
            </div>
          ) : (
            <div className='bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50'>
              {recentUsers.map((user) => (
                <div key={user.id} className='flex items-center gap-3 px-4 py-3'>
                  <Avatar src={user.avatar_url} name={user.full_name} size='sm' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-900 truncate'>{user.full_name}</p>
                    <p className='text-xs text-gray-400 truncate'>{user.email}</p>
                  </div>
                  {user.suspended_at && (
                    <span className='text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0'>
                      Suspended
                    </span>
                  )}
                  <button
                    onClick={() => toggleSuspend(user)}
                    className={
                      'text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ' +
                      (user.suspended_at
                        ? 'border-green-200 text-green-700 hover:bg-green-50'
                        : 'border-red-200 text-red-700 hover:bg-red-50')
                    }
                  >
                    {user.suspended_at ? 'Unsuspend' : 'Suspend'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Ban Confirmation Modal */}
      <Modal
        isOpen={banModalOpen}
        onClose={() => {
          setBanModalOpen(false);
          setBanTarget(null);
          setBanFlagId(null);
          setBanInput('');
        }}
        title='Confirm Suspension'
      >
        <div className='space-y-4'>
          <p className='text-sm text-gray-700'>
            You are about to suspend{' '}
            <span className='font-semibold'>{banTarget?.full_name}</span>. This will prevent them
            from logging in. Type <span className='font-mono font-bold'>BAN</span> to confirm.
          </p>
          <input
            type='text'
            value={banInput}
            onChange={(e) => setBanInput(e.target.value)}
            placeholder='Type BAN to confirm'
            className='w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400'
          />
          <div className='flex gap-3 justify-end'>
            <button
              onClick={() => {
                setBanModalOpen(false);
                setBanTarget(null);
                setBanFlagId(null);
                setBanInput('');
              }}
              className='text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={banUser}
              disabled={banInput !== 'BAN'}
              className={
                'text-sm px-4 py-2 rounded-lg font-medium transition-colors ' +
                (banInput === 'BAN'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed')
              }
            >
              Suspend User
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
