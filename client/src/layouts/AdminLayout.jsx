import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/admin/Sidebar';

const AdminLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-white font-sans md:pl-64">
      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 bg-black/80 z-40 transition-opacity md:hidden ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setMobileMenuOpen(false)}></div>
      
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar closeMobile={() => setMobileMenuOpen(false)} />
      </div>

      <div className="p-4 md:p-8 w-full max-w-full overflow-hidden">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative">
          <div className="flex items-center gap-4">
              <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg">
                  <Menu size={24} />
              </button>
              <h2 className="text-2xl font-bold">Command Center</h2>
          </div>
        </header>

        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
