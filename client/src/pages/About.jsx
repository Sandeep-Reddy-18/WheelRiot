import React from 'react';
import { Shield, Truck, Award, Zap } from 'lucide-react';

const About = () => {
  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tighter">
          MORE THAN JUST <span className="text-primary">TOYS</span>.
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          Wheel Riot was born from a simple obsession: The journey of collecting miniature diecast cars. 
        </p>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
        <div className="bg-surface p-8 rounded-2xl border border-white/10 flex flex-col justify-center min-h-[300px]">
           <h2 className="text-3xl font-bold mb-4">The Wheel Riot's Standards</h2>
           <p className="text-gray-400">
             Every model that comes in, is inspected for any cosmetic flaws and decal alignment.
           </p>
        </div>
        <div className="bg-zinc-900 rounded-2xl overflow-hidden min-h-[300px] relative group">
           {/* Visual Placeholder */}
           <div className="absolute inset-0 bg-gradient-to-tr from-primary to-transparent opacity-20"></div>
           <div className="absolute bottom-8 left-8">
              <div className="text-5xl font-bold">50+</div>
              <div className="text-sm uppercase tracking-widest text-gray-400">Models</div>
           </div>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Shield, title: "Authenticity Guaranteed", desc: "No knocks-offs. Only licensed originals." },
          { icon: Truck, title: "Secure Shipping", desc: "Packaging for safe transit." },
          { icon: Award, title: "Collector Grade", desc: "Curated for the discerning eye." },
          { icon: Zap, title: "Fast Delivery", desc: "Dispatched within 24 hours." }
        ].map((item, idx) => (
          <div key={idx} className="bg-surface p-6 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
            <item.icon className="text-primary mb-4" size={32} />
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
