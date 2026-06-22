import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Package, ShieldCheck, Truck, Instagram, ArrowRight } from 'lucide-react';
import TextPressure from '../components/TextPressure';
import GridMotion from '../components/GridMotion';
import ShinyText from '../components/ShinyText';
import ProductCard from '../components/ProductCard';
import gridMiddle from '../assets/grid-middle.png';

const Home = () => {
  const images = import.meta.glob('../assets/grid-images/*.{png,jpg,jpeg,svg}', { eager: true });
  const rawImages = Object.values(images).map((img) => img.default);
  const gridItems = rawImages.flatMap(img => [img, gridMiddle]);
  if (gridItems.length === 0) gridItems.push(gridMiddle);

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [featRes, bestRes] = await Promise.all([
                axios.get('/api/products?featured=true&limit=4'),
                axios.get('/api/products?sort=bestsellers&limit=4')
            ]);
            setFeaturedProducts(featRes.data.products);
            setBestSellers(bestRes.data.products);
        } catch(err) {
            console.error("Failed to load home data", err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const SectionHeader = ({ title, subtitle }) => (
      <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-4 text-white">
            {title}
          </h2>
          <div className="h-1 w-24 bg-primary mx-auto rounded-full mb-4"></div>
          {subtitle && <p className="text-gray-400 font-medium tracking-wide uppercase text-sm">{subtitle}</p>}
      </div>
  );

  return (
    <div className="bg-black min-h-screen pb-20">
      {/* 1. HERO SECTION */}
      <section className="h-screen w-full relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0 opacity-60">
            <GridMotion items={gridItems} gradientColor="#000000" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center flex flex-col items-center justify-center p-4 w-full"
        >
          <div className="relative w-full max-w-6xl min-h-[150px] md:min-h-[200px] flex items-center justify-center mb-8">
             <TextPressure
                text="WHEEL RIOT"
                flex={true}
                alpha={false}
                stroke={false}
                width={true}
                weight={true}
                italic={true}
                textColor="#ffffff"
                minFontSize={36} 
                minWeight={500}
             />
          </div>
          <div className="relative z-10 mb-12">
            <ShinyText 
              text="FOR COLLECTORS, BY COLLECTORS" 
              disabled={false} 
              speed={3} 
              className="text-white/90 font-bold tracking-[0.3em] text-[clamp(0.8rem,2vw,1.2rem)] drop-shadow-md" 
              color="#e0e0e0"
              shineColor="#ffffff" 
              spread={120} 
              delay={0}
              yoyo={true}
            />
          </div>
          <Link to="/shop" className="group relative px-12 py-4 bg-primary text-white text-lg font-black tracking-widest rounded-full hover:bg-red-700 transition-all shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:scale-105 hover:shadow-[0_0_50px_rgba(220,38,38,0.8)] overflow-hidden">
            <span className="relative z-10">SHOP COLLECTION</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          </Link> 
        </motion.div>
      </section>

      {/* 2. TRUST BADGES */}
      <section className="py-16 bg-surface border-y border-white/5">
         <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                { icon: ShieldCheck, title: "100% Original", desc: "Authentic die-cast models guaranteed." },
                { icon: Package, title: "High Quality Packaging", desc: "Shipped with extreme care & protection." },
                { icon: Truck, title: "All India Shipping", desc: "Fast delivery to your doorstep, everywhere." }
            ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-6 bg-black/20 rounded-xl border border-white/5 hover:border-primary/50 hover:bg-black/40 transition-all group">
                    <div className="bg-white/5 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform group-hover:bg-primary/20">
                        <item.icon size={32} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-bold italic mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
            ))}
         </div>
      </section>

      {/* 3. FEATURED PRODUCTS */}
      <section className="py-24 max-w-7xl mx-auto px-4">
          <SectionHeader title="Featured Drops" subtitle="Handpicked for your collection" />
          
          {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featuredProducts.map(p => <ProductCard key={p._id} product={p} />)}
              </div>
          ) : (
              <div className="text-center py-12 bg-surface rounded-xl border border-white/5">
                  <p className="text-2xl font-bold text-gray-500 mb-2">No Featured Products</p>
                  <p className="text-gray-400">All featured products will appear here.</p>
                  <Link to="/shop" className="inline-block mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-bold">Browse Catalog</Link>
              </div>
          )}
          
          {featuredProducts.length > 0 && (
             <div className="text-center mt-12">
                 <Link to="/shop?featured=true" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold tracking-widest uppercase text-sm border-b border-transparent hover:border-primary transition-all pb-1">
                    View All Featured <ArrowRight size={16} />
                 </Link>
             </div>
          )}
      </section>

      {/* 4. WHY WHEEL RIOT */}
      <section className="py-24 bg-surface border-y border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
              <h2 className="text-3xl md:text-4xl font-black italic mb-8">WHY WHEEL RIOT?</h2>
              <div className="space-y-6 text-lg text-gray-300 leading-relaxed font-light">
                  <p>
                      <span className="font-bold text-white">Wheel Riot</span> was created by a collector — not a reseller.
                  </p>
                  <p>
                      We bring <span className="text-primary font-bold">authentic, hard-to-find</span> die-cast cars without inflated prices or fakes.
                  </p>
                  <p>
                      No knock-offs. Just pure passion for diecast collectors.
                  </p>
              </div>
          </div>
      </section>

      {/* 5. BEST SELLERS */}
      <section className="py-24 max-w-7xl mx-auto px-4">
          <SectionHeader title="Best Sellers" subtitle="Most bought by the community" />
          
          {loading ? (
             <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : bestSellers.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {bestSellers.map(p => <ProductCard key={p._id} product={p} />)}
             </div>
          ) : (
             <div className="text-center py-12">
                 <p className="text-gray-500">Analyzing sales data...</p>
             </div>
          )}
      </section>

      {/* 6. SOCIAL PROOF */}
      <section className="py-16 bg-gradient-to-b from-black to-surface border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 text-center">
              <div className="flex justify-center mb-6">
                  <Instagram size={48} className="text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold mb-4">@wheelriot</h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                  Follow us for exclusive drops, and community showcases. Use <span className="text-white font-bold">#WheelRiot</span> to get featured.
              </p>
              <a href="https://instagram.com/wheelriot" target="_blank" rel="noreferrer" className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-white hover:scale-105 transition-transform shadow-lg shadow-pink-500/20">
                  Open Instagram Profile
              </a>
          </div>
      </section>
    </div>
  );
};

export default Home;
