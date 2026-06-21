import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUser, HiOutlineMail } from 'react-icons/hi';

const ProfilePage = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });



  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="card text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-txt-primary">{user?.name}</h1>
        <p className="text-txt-secondary">{user?.email}</p>

      </div>

      {/* Profile Details */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-txt-primary">Profile Details</h2>
          <button onClick={() => setEditing(!editing)}
            className={editing ? 'btn-outline text-sm' : 'btn-secondary text-sm'}>
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label flex items-center gap-1">
              <HiOutlineUser className="text-sm" /> Name
            </label>
            {editing ? (
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="input" />
            ) : (
              <p className="text-txt-primary font-medium py-2">{user?.name}</p>
            )}
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <HiOutlineMail className="text-sm" /> Email
            </label>
            <p className="text-txt-primary font-medium py-2">{user?.email}</p>
          </div>

        </div>

        {editing && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <button className="btn-primary py-2.5">Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
