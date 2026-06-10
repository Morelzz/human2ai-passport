"use client";

import { useEffect, useRef } from "react";

// ──────────────────────────────────────────────────────────────────────────
// VOID FIELD — campo di particelle WebGL (Three.js) per la CTA finale.
// Un'onda di punti viola che respira nel void: profondità, non decorazione.
// Regole Dala rispettate: un solo colore (il viola d'azione), niente glow
// gratuito — la luce nasce dal movimento dei punti su nero assoluto.
//
// Budget: ~6k punti desktop / ~2.5k mobile, pixel ratio ≤1.6, low-power,
// import dinamico di three (chunk separato), animazione SOLO quando la
// sezione è in viewport, niente canvas con prefers-reduced-motion.
// ──────────────────────────────────────────────────────────────────────────

export default function VoidField({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed || !host.isConnected) return;

      const w = host.clientWidth || 800;
      const h = host.clientHeight || 480;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(w, h);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 60);
      camera.position.set(0, 2.4, 7.5);
      camera.lookAt(0, -0.4, 0);

      // Griglia di punti: ampia e bassa, vista di taglio = orizzonte digitale.
      const isSmall = w < 768;
      const COLS = isSmall ? 64 : 104;
      const ROWS = isSmall ? 40 : 58;
      const N = COLS * ROWS;
      const base = new Float32Array(N * 3);
      let k = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          base[k++] = (c / (COLS - 1) - 0.5) * 22; // x
          base[k++] = 0;                            // y (animata)
          base[k++] = (r / (ROWS - 1) - 0.5) * 14;  // z
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
      const mat = new THREE.PointsMaterial({
        color: 0x8b47f0,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      const arr = (geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>).array as Float32Array;
      let t = 0;
      let raf = 0;
      let running = true;

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!running) return;
        t += 0.011;
        for (let i = 0; i < N; i++) {
          const x = base[i * 3];
          const z = base[i * 3 + 2];
          // Due onde incrociate: il "respiro" del void
          arr[i * 3 + 1] =
            Math.sin(x * 0.55 + t) * 0.38 +
            Math.cos(z * 0.85 + t * 0.8) * 0.3 +
            Math.sin((x + z) * 0.3 + t * 0.5) * 0.18;
        }
        (geo.attributes.position as InstanceType<typeof THREE.BufferAttribute>).needsUpdate = true;
        points.rotation.y = Math.sin(t * 0.05) * 0.06;
        renderer.render(scene, camera);
      };
      tick();

      // Si anima solo quando è in vista (risparmio batteria/CPU).
      const io = new IntersectionObserver(([e]) => {
        running = !!e?.isIntersecting;
      });
      io.observe(host);

      const onResize = () => {
        const w2 = host.clientWidth || w;
        const h2 = host.clientHeight || h;
        renderer.setSize(w2, h2);
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener("resize", onResize);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className={className} style={{ pointerEvents: "none" }} />;
}
