
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const GridMotion = ({ items = [], gradientColor = 'black' }) => {
  const gridRef = useRef(null);
  const rowRefs = useRef([]);
  const mouseXRef = useRef(window.innerWidth / 2);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  const totalItems = 28;
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);
  const combinedItems = items.length > 0 ? items.slice(0, totalItems) : defaultItems;

  useEffect(() => {
    gsap.ticker.lagSmoothing(0);

    const handleMouseMove = e => {
      if (isScrolling.current) return;
      mouseXRef.current = e.clientX;
    };

    const handleScroll = () => {
        isScrolling.current = true;
        clearTimeout(scrollTimeout.current);
        
        const scrollFactor = 1.5; 
        const simulatedX = (window.scrollY * scrollFactor); 
        mouseXRef.current = simulatedX;

        scrollTimeout.current = setTimeout(() => {
            isScrolling.current = false;
        }, 150);
    };

    // Animation Loop
    const updateMotion = () => {
      const maxMoveAmount = 300; 
      const baseDuration = 0.8;
      const inertiaFactors = [0.6, 0.4, 0.3, 0.2];

      rowRefs.current.forEach((row, index) => {
        if (row) {
          const direction = index % 2 === 0 ? 1 : -1;
          const moveAmount = ((mouseXRef.current / window.innerWidth) * maxMoveAmount - maxMoveAmount / 2) * direction;

          gsap.to(row, {
            x: moveAmount,
            duration: baseDuration + inertiaFactors[index % inertiaFactors.length],
            ease: 'power3.out',
            overwrite: 'auto'
          });
        }
      });
    };

    // Initial Animation
    gsap.fromTo(
      mouseXRef,
      { current: 0 },
      { current: window.innerWidth, duration: 1.5, ease: 'power3.out' }
    );

    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
            gsap.ticker.add(updateMotion);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('scroll', handleScroll);
        } else {
            gsap.ticker.remove(updateMotion);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
        }
    }, { threshold: 0 });

    if (gridRef.current) {
        observer.observe(gridRef.current);
    }

    return () => {
      observer.disconnect();
      gsap.ticker.remove(updateMotion);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div ref={gridRef} className="h-full w-full overflow-hidden bg-black">
      <section
        className="w-full h-full overflow-hidden relative flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`
        }}
      >
        <div className="absolute inset-0 pointer-events-none z-[4] bg-[length:250px]"></div>
        <div className="gap-3 md:gap-6 flex-none relative w-[500vw] md:w-[250vw] h-[150vh] grid grid-rows-4 grid-cols-1 rotate-[-15deg] origin-center z-[2]">
          {[...Array(4)].map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-3 md:gap-6 grid-cols-7"
              style={{ willChange: 'transform, filter' }}
              ref={el => (rowRefs.current[rowIndex] = el)}
            >
              {[...Array(7)].map((_, itemIndex) => {
                const content = combinedItems[(rowIndex * 7 + itemIndex) % combinedItems.length]; // Modulo to repeat items
                return (
                  <div key={itemIndex} className="relative h-full w-full">
                    <div className="relative w-full h-full overflow-hidden rounded-[10px] bg-[#111] flex items-center justify-center text-white text-[1.5rem] border border-white/10">
                      {typeof content === 'string' && (content.startsWith('http') || content.startsWith('/')) ? (
                        <div
                          className="w-full h-full bg-cover bg-center absolute top-0 left-0"
                          style={{ backgroundImage: `url(${content})` }}
                        ></div>
                      ) : (
                        <div className="p-4 text-center z-[1]">{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="relative w-full h-full top-0 left-0 pointer-events-none"></div>
      </section>
    </div>
  );
};

export default GridMotion;
