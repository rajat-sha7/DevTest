import { useEffect, useRef } from "react";

export function useVerticalSlideSections() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = Array.from(container.querySelectorAll("section")) as HTMLElement[];

    // Use Intersection Observer for reliable animation triggering
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: [0, 0.25, 0.5, 0.75, 1]
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target as HTMLElement;
        
        if (entry.isIntersecting) {
          // Calculate visibility: how much of the section is in viewport
          const rect = entry.boundingClientRect;
          const vh = window.innerHeight;
          
          // Position relative to viewport (0 = bottom, 1 = top)
          const positionInViewport = 1 - (rect.bottom / (vh + rect.height));
          
          // Slide and fade effect
          const translateY = Math.max(0, (1 - positionInViewport) * 50); // Slide up max 50px
          const opacity = Math.min(1, positionInViewport * 1.5);
          
          section.style.transform = `translateY(${translateY}px)`;
          section.style.opacity = String(opacity);
        } else {
          // Reset when out of view
          section.style.transform = "translateY(50px)";
          section.style.opacity = "0";
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));

    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, []);

  return containerRef;
}
