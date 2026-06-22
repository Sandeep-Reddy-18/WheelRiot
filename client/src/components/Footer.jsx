import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-surface text-gray-400 py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
        {/* About */}
        <div>
          <h4 className="text-white font-bold mb-4">WHEEL RIOT</h4>
          <p className="text-sm">
            Created by collectors, for collectors. Bringing authentic, premium die-cast models to you.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-2">
            <h4 className="text-white font-bold mb-2">LINKS</h4>
            <a href="/about" className="hover:text-primary transition-colors">About Us</a>
            <a href="/shop" className="hover:text-primary transition-colors">Shop</a>
            <a href="#" className="hover:text-primary transition-colors">Terms & Privacy</a>
        </div>

        {/* Contact */}
        <div>
           <h4 className="text-white font-bold mb-2">CONTACT</h4>
           <div className="flex flex-col gap-2 text-sm">
             <p>Email: <a href="mailto:support@wheelriot.in" className="text-white hover:text-primary">wheelriot@gmail.com</a></p>
             <a href="https://instagram.com/wheelriot" target="_blank" rel="noreferrer" className="text-pink-500 hover:text-pink-400 font-bold">
               Follow us on Instagram @wheelriot
             </a>
           </div>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-gray-600 flex flex-col gap-2">
         <p>&copy; {new Date().getFullYear()} Wheel Riot. All rights reserved.</p>
         <p className="font-bold">Designed and Maintained by <a href="https://sandyy.in" target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary transition-colors underline">Sandeep Reddy M</a></p>
      </div>
    </footer>
  );
};

export default Footer;
