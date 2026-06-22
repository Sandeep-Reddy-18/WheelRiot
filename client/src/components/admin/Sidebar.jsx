import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, Activity, Settings, LogOut, Tag, Star } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ closeMobile }) => {
  const location = useLocation();
  
  const links = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: ShoppingBag },
    { name: 'Orders', path: '/admin/orders', icon: Package },
    { name: 'Brands', path: '/admin/brands', icon: Tag },
    { name: 'Reviews', path: '/admin/reviews', icon: Star },
    { name: 'Coupons', path: '/admin/coupons', icon: Tag },
    { name: 'Activity Logs', path: '/admin/logs', icon: Activity },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-surface border-r border-white/10 h-screen text-gray-300 flex flex-col pointer-events-auto">
      <div className="p-6 flex items-center gap-3">
         <div className="bg-primary/20 p-2 rounded-full"><LayoutDashboard size={20} className="text-primary"/></div> {/* Actually let's use the new Avatar here maybe? No, header. */}
        <h1 className="text-2xl font-bold text-white tracking-tighter">WHEEL RIOT<span className="text-primary">.admin</span></h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={link.path} 
              to={link.path} 
              onClick={() => closeMobile && closeMobile()}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive ? "bg-primary text-white" : "hover:bg-white/5"
              )}
            >
              <link.icon size={20} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('wheelriot_admin');
            localStorage.removeItem('user');
            window.location.href = '/admin/login';
          }}
          className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 w-full"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
