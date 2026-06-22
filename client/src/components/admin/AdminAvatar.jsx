import React from 'react';
import { UserCircle } from 'lucide-react';

const AdminAvatar = ({ size = 32 }) => {
  return (
    <div className={`rounded-full bg-white/10 flex items-center justify-center`} style={{ width: size, height: size }}>
      <UserCircle size={size * 0.8} className="text-primary" />
    </div>
  );
};

export default AdminAvatar;
