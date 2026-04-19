import React, { useRef, useEffect, useState, useCallback } from 'react';

/* ============================================================
   ANIMATION ENGINE — Full-Screen Interactive 3D Canvas Player
   Type ANY topic → instant stunning animated visualization
   ============================================================ */

interface AnimPhase { label: string; narration: string; }

interface AnimObj {
  type: 'circle' | 'ring' | 'label' | 'rect' | 'line' | 'glow';
  x: number; y: number; radius?: number; w?: number; h?: number;
  color: string; label?: string; glow?: boolean; pulse?: boolean;
  fontSize?: number; info?: string; opacity?: number;
  x2?: number; y2?: number; // for lines
}

// ---- Utility ----
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;

// ==========================
//  TOPIC-SPECIFIC ANIMATIONS
// ==========================

function solarSystem(phase: number, t: number, w: number, h: number): AnimObj[] {
  const cx = w / 2, cy = h / 2, objs: AnimObj[] = [];
  const planets = [
    { name: 'Mercury', c: '#b5b5b5', r: 5, orbit: 70, spd: 4.5, info: 'Closest planet to the Sun. No atmosphere.' },
    { name: 'Venus', c: '#f5c842', r: 7, orbit: 100, spd: 3.2, info: 'Hottest planet due to greenhouse effect. Rotates backwards.' },
    { name: 'Earth', c: '#4a9eff', r: 8, orbit: 138, spd: 2.4, info: 'Only planet with liquid water and life as we know it.' },
    { name: 'Mars', c: '#ff6b35', r: 6, orbit: 175, spd: 1.8, info: 'The Red Planet. Has the tallest volcano — Olympus Mons.' },
    { name: 'Jupiter', c: '#e8a565', r: 18, orbit: 230, spd: 0.95, info: 'Largest planet. The Great Red Spot is a giant storm.' },
    { name: 'Saturn', c: '#f0d68a', r: 14, orbit: 290, spd: 0.6, info: 'Famous rings made of ice and rock particles.' },
  ];
  // Stars
  for (let i = 0; i < 60; i++) objs.push({ type: 'circle', x: (i * 137.5 + 23) % w, y: (i * 97.3 + 11) % h, radius: 0.5 + Math.sin(t * 2 + i) * 0.5, color: '#ffffff', pulse: true, opacity: 0.3 + Math.sin(t + i) * 0.3 });
  // Sun glow
  objs.push({ type: 'glow', x: cx, y: cy, radius: 80 + Math.sin(t) * 5, color: '#FFD700', opacity: 0.15 });
  objs.push({ type: 'glow', x: cx, y: cy, radius: 55, color: '#FFA500', opacity: 0.2 });
  objs.push({ type: 'circle', x: cx, y: cy, radius: 32, color: '#FFD700', glow: true, label: '☀ Sun', info: 'Our star. 4.6 billion years old, surface temp ~5500°C', fontSize: 11 });
  // Planets
  const show = phase === 0 ? 1 : phase === 1 ? 4 : 6;
  for (let i = 0; i < show; i++) {
    const p = planets[i];
    objs.push({ type: 'ring', x: cx, y: cy, radius: p.orbit, color: 'rgba(255,255,255,0.06)' });
    const a = t * p.spd + i * 1.1;
    const px = cx + Math.cos(a) * p.orbit;
    const py = cy + Math.sin(a) * p.orbit * 0.45;
    if (p.name === 'Earth') { // Moon
      const ma = t * 8 + 1;
      objs.push({ type: 'circle', x: px + Math.cos(ma) * 14, y: py + Math.sin(ma) * 14, radius: 2, color: '#cbd5e1', info: 'Moon — Earth\'s only natural satellite' });
    }
    if (p.name === 'Saturn') { // Rings
      objs.push({ type: 'ring', x: px, y: py, radius: 22, color: 'rgba(240,214,138,0.35)' });
      objs.push({ type: 'ring', x: px, y: py, radius: 26, color: 'rgba(240,214,138,0.2)' });
    }
    objs.push({ type: 'circle', x: px, y: py, radius: p.r, color: p.c, glow: true, label: p.name, info: p.info, fontSize: 9 });
  }
  return objs;
}

function atomStructure(phase: number, t: number, w: number, h: number): AnimObj[] {
  const cx = w / 2, cy = h / 2, objs: AnimObj[] = [];
  objs.push({ type: 'glow', x: cx, y: cy, radius: 200, color: '#001d3d', opacity: 0.5 });
  // Nucleus
  objs.push({ type: 'glow', x: cx, y: cy, radius: 40, color: '#ff4444', opacity: 0.3 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.5, r = 10 + Math.sin(t * 3 + i) * 4;
    objs.push({ type: 'circle', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, radius: 5, color: i < 4 ? '#ff6b6b' : '#66b3ff', info: i < 4 ? 'Proton: +1 charge' : 'Neutron: neutral' });
  }
  objs.push({ type: 'label', x: cx, y: cy + 35, color: '#ffffff', label: 'Nucleus', fontSize: 11, opacity: 0.7 });
  // Shell 1
  if (phase >= 1) {
    objs.push({ type: 'ring', x: cx, y: cy, radius: 65, color: 'rgba(0,255,255,0.12)' });
    for (let i = 0; i < 2; i++) {
      const a = t * 3 + i * Math.PI;
      objs.push({ type: 'circle', x: cx + Math.cos(a) * 65, y: cy + Math.sin(a) * 65, radius: 5, color: '#00ffff', glow: true, label: 'e⁻', info: 'Electron: -1 charge, ~0 mass', fontSize: 8 });
    }
  }
  // Shell 2
  if (phase >= 2) {
    objs.push({ type: 'ring', x: cx, y: cy, radius: 115, color: 'rgba(200,100,255,0.1)' });
    for (let i = 0; i < 8; i++) {
      const a = t * 2 + (i / 8) * TAU;
      objs.push({ type: 'circle', x: cx + Math.cos(a) * 115, y: cy + Math.sin(a) * 115, radius: 4, color: '#c864ff', glow: true, fontSize: 7 });
    }
    objs.push({ type: 'label', x: cx + 120, y: cy - 40, color: '#c864ff', label: 'Shell 2 (8e⁻)', fontSize: 10, opacity: 0.6 });
  }
  // Shell 3
  if (phase >= 3) {
    objs.push({ type: 'ring', x: cx, y: cy, radius: 170, color: 'rgba(0,255,120,0.08)' });
    for (let i = 0; i < 6; i++) {
      const a = t * 1.4 + (i / 6) * TAU;
      objs.push({ type: 'circle', x: cx + Math.cos(a) * 170, y: cy + Math.sin(a) * 170, radius: 3.5, color: '#00ff78', glow: true });
    }
    objs.push({ type: 'label', x: cx, y: cy + 200, color: '#00ff78', label: 'Shell 3 (6e⁻) — Valence electrons determine bonding', fontSize: 10, opacity: 0.5 });
  }
  return objs;
}

function photosynthesis(phase: number, t: number, w: number, h: number): AnimObj[] {
  const objs: AnimObj[] = [];
  // Sun
  objs.push({ type: 'glow', x: w * 0.12, y: h * 0.12, radius: 90, color: '#FFD700', opacity: 0.1 });
  objs.push({ type: 'circle', x: w * 0.12, y: h * 0.12, radius: 36, color: '#FFD700', glow: true, label: '☀ Sunlight', info: 'Provides light energy (photons)', fontSize: 10 });
  // Rays
  for (let i = 0; i < 6; i++) {
    const p = ((t * 0.2 + i * 0.15) % 1);
    const lx = w * 0.12, ly = h * 0.12, tx = w * 0.52, ty = h * 0.45;
    objs.push({ type: 'circle', x: lerp(lx, tx, p), y: lerp(ly, ty, p), radius: 3, color: '#FFD700', pulse: true, opacity: 1 - p, info: 'Light photon' });
  }
  // Leaf
  objs.push({ type: 'glow', x: w * 0.52, y: h * 0.45, radius: 80, color: '#22c55e', opacity: 0.12 });
  objs.push({ type: 'circle', x: w * 0.52, y: h * 0.45, radius: 45, color: '#22c55e', glow: true, label: '🍃 Chloroplast', info: 'Contains chlorophyll that captures light', fontSize: 10 });
  // Stem + roots
  objs.push({ type: 'rect', x: w * 0.52 - 3, y: h * 0.45 + 45, w: 6, h: 70, color: '#16a34a' });
  objs.push({ type: 'rect', x: w * 0.52 - 18, y: h * 0.45 + 115, w: 4, h: 25, color: '#854d0e' });
  objs.push({ type: 'rect', x: w * 0.52 + 14, y: h * 0.45 + 115, w: 4, h: 25, color: '#854d0e' });
  // CO2
  if (phase >= 1) {
    for (let i = 0; i < 5; i++) {
      const xoff = w * 0.15 + ((t * 30 + i * 55) % (w * 0.35));
      objs.push({ type: 'circle', x: xoff, y: h * 0.38 + Math.sin(t * 2 + i) * 12, radius: 10, color: '#94a3b8', label: 'CO₂', info: 'Carbon dioxide absorbed through stomata', fontSize: 8 });
    }
    // H2O from below
    for (let i = 0; i < 4; i++) {
      const p = ((t * 0.15 + i * 0.25) % 1);
      objs.push({ type: 'circle', x: w * 0.52 + (i - 2) * 8, y: h * 0.45 + 115 - p * 115, radius: 4, color: '#3b82f6', label: 'H₂O', info: 'Water absorbed by roots', fontSize: 7 });
    }
  }
  // O2 output + Glucose
  if (phase >= 2) {
    for (let i = 0; i < 6; i++) {
      const yoff = -((t * 25 + i * 35) % 140);
      objs.push({ type: 'circle', x: w * 0.72 + Math.sin(t + i) * 15, y: h * 0.45 + yoff, radius: 8, color: '#22d3ee', label: 'O₂', info: 'Oxygen released into air!', fontSize: 9, glow: true });
    }
    objs.push({ type: 'circle', x: w * 0.52, y: h * 0.45, radius: 14, color: '#f59e0b', glow: true, label: 'C₆H₁₂O₆', info: 'Glucose — plant\'s food and energy source', fontSize: 7 });
  }
  if (phase >= 3) {
    objs.push({ type: 'label', x: w * 0.5, y: h * 0.88, color: '#ffffff', label: '6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂', fontSize: 15 });
  }
  return objs;
}

function waterCycle(phase: number, t: number, w: number, h: number): AnimObj[] {
  const objs: AnimObj[] = [];
  // Sun
  objs.push({ type: 'circle', x: w * 0.85, y: h * 0.1, radius: 30, color: '#FFD700', glow: true, label: '☀', info: 'Heats water causing evaporation' });
  // Mountains
  for (let i = 0; i < 3; i++) {
    const mx = w * 0.08 + i * 45;
    objs.push({ type: 'rect', x: mx, y: h * 0.5 - i * 25, w: 35, h: h * 0.25 + i * 25, color: i === 1 ? '#6b7280' : '#4b5563' });
  }
  // Ocean
  objs.push({ type: 'rect', x: 0, y: h * 0.72, w: w, h: h * 0.28, color: '#1e40af' });
  for (let i = 0; i < 15; i++) {
    const wx = (i / 15) * w;
    objs.push({ type: 'circle', x: wx, y: h * 0.72 + Math.sin(t * 2 + i * 0.8) * 4, radius: 3, color: '#60a5fa', opacity: 0.6 });
  }
  objs.push({ type: 'label', x: w * 0.5, y: h * 0.85, color: '#93c5fd', label: '🌊 Ocean / Water Bodies', fontSize: 13 });
  // Evaporation
  if (phase >= 0) {
    for (let i = 0; i < 10; i++) {
      const p = ((t * 0.12 + i * 0.1) % 1);
      objs.push({ type: 'circle', x: w * 0.25 + i * (w * 0.05), y: h * 0.72 - p * (h * 0.42), radius: 2.5, color: `rgba(96,165,250,${1 - p})`, info: 'Water vapor rising' });
    }
    objs.push({ type: 'label', x: w * 0.6, y: h * 0.55, color: '#60a5fa', label: '↑ Evaporation', fontSize: 11, opacity: 0.6 });
  }
  // Clouds
  if (phase >= 1) {
    for (let ci = 0; ci < 3; ci++) {
      const cx = w * 0.2 + ci * (w * 0.25) + Math.sin(t * 0.3 + ci) * 8;
      const cy2 = h * 0.18 + ci * 12;
      objs.push({ type: 'circle', x: cx, y: cy2, radius: 28, color: '#e2e8f0', info: 'Cloud: condensed water vapor' });
      objs.push({ type: 'circle', x: cx + 22, y: cy2 - 5, radius: 22, color: '#cbd5e1' });
      objs.push({ type: 'circle', x: cx - 18, y: cy2 + 4, radius: 20, color: '#f1f5f9' });
    }
    objs.push({ type: 'label', x: w * 0.45, y: h * 0.08, color: '#e2e8f0', label: '☁ Condensation', fontSize: 11 });
  }
  // Rain
  if (phase >= 2) {
    for (let i = 0; i < 20; i++) {
      const rx = w * 0.1 + (i * 67) % (w * 0.75);
      const ry = h * 0.28 + ((t * 70 + i * 45) % (h * 0.44));
      objs.push({ type: 'circle', x: rx, y: ry, radius: 2, color: '#3b82f6' });
    }
    objs.push({ type: 'label', x: w * 0.3, y: h * 0.42, color: '#3b82f6', label: '↓ Precipitation', fontSize: 11, opacity: 0.6 });
  }
  if (phase >= 3) {
    objs.push({ type: 'label', x: w * 0.5, y: h * 0.65, color: '#93c5fd', label: '↻ Water collects → Cycle repeats endlessly', fontSize: 13, opacity: 0.8 });
  }
  return objs;
}

function cellBiology(phase: number, t: number, w: number, h: number): AnimObj[] {
  const cx = w / 2, cy = h / 2, objs: AnimObj[] = [];
  // Cell membrane
  objs.push({ type: 'glow', x: cx, y: cy, radius: 200, color: '#4a9eff', opacity: 0.05 });
  objs.push({ type: 'ring', x: cx, y: cy, radius: 180, color: 'rgba(74,158,255,0.3)' });
  objs.push({ type: 'ring', x: cx, y: cy, radius: 175, color: 'rgba(74,158,255,0.15)' });
  objs.push({ type: 'label', x: cx + 160, y: cy - 80, color: '#4a9eff', label: 'Cell Membrane', fontSize: 10, opacity: 0.6 });
  // Nucleus
  objs.push({ type: 'glow', x: cx, y: cy - 10, radius: 60, color: '#a855f7', opacity: 0.2 });
  objs.push({ type: 'circle', x: cx, y: cy - 10, radius: 45, color: '#7c3aed', glow: true, label: 'Nucleus', info: 'Control center: contains DNA', fontSize: 11 });
  if (phase >= 0) {
    // DNA strands inside
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + (i / 6) * TAU;
      objs.push({ type: 'circle', x: cx + Math.cos(a) * 20, y: cy - 10 + Math.sin(a) * 20, radius: 2, color: '#c084fc', info: 'DNA strand' });
    }
  }
  // Mitochondria
  if (phase >= 1) {
    const mx = cx + 100 + Math.sin(t * 0.5) * 10, my = cy + 40;
    objs.push({ type: 'circle', x: mx, y: my, radius: 20, color: '#ef4444', glow: true, label: 'Mitochondria', info: 'Powerhouse of the cell: produces ATP energy', fontSize: 9 });
    // ER
    const ex = cx - 90, ey = cy + 30;
    objs.push({ type: 'circle', x: ex, y: ey, radius: 16, color: '#f59e0b', label: 'ER', info: 'Endoplasmic Reticulum: protein & lipid synthesis', fontSize: 9 });
    objs.push({ type: 'ring', x: ex, y: ey, radius: 22, color: 'rgba(245,158,11,0.2)' });
  }
  // Ribosomes & Golgi
  if (phase >= 2) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.3;
      const r = 80 + Math.sin(i * 2) * 20;
      objs.push({ type: 'circle', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, radius: 3, color: '#22d3ee', info: 'Ribosome: builds proteins' });
    }
    const gx = cx - 40, gy = cy + 100;
    objs.push({ type: 'circle', x: gx, y: gy, radius: 18, color: '#22c55e', label: 'Golgi', info: 'Golgi Apparatus: packages and ships proteins', fontSize: 9 });
  }
  // Cytoplasm particles
  if (phase >= 3) {
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU, r = 100 + Math.sin(t + i) * 50;
      const px = cx + Math.cos(a + t * 0.1) * r, py = cy + Math.sin(a + t * 0.1) * r;
      if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) < 170) {
        objs.push({ type: 'circle', x: px, y: py, radius: 1.5, color: '#94a3b8', opacity: 0.3 });
      }
    }
    objs.push({ type: 'label', x: cx + 80, y: cy + 150, color: '#94a3b8', label: 'Cytoplasm', fontSize: 10, opacity: 0.5 });
  }
  return objs;
}

// Generic fallback — impressive animated knowledge graph
function genericAnimation(topic: string, phase: number, t: number, w: number, h: number): AnimObj[] {
  const cx = w / 2, cy = h / 2, objs: AnimObj[] = [];
  const words = topic.split(/\s+/).filter(w => w.length > 2).slice(0, 8);
  if (words.length === 0) words.push(topic.substring(0, 12));
  const colors = ['#00ccff', '#ff6b35', '#00ff88', '#a855f7', '#facc15', '#ff2d55', '#4ade80', '#f472b6'];

  // Ambient particles
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU + t * 0.05;
    const r = 200 + Math.sin(t * 0.3 + i) * 60;
    objs.push({ type: 'circle', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, radius: 1.5, color: colors[i % colors.length], opacity: 0.2 + Math.sin(t + i) * 0.15 });
  }
  // Outer ring
  objs.push({ type: 'ring', x: cx, y: cy, radius: 200, color: 'rgba(255,255,255,0.03)' });
  objs.push({ type: 'ring', x: cx, y: cy, radius: 140, color: 'rgba(0,204,255,0.06)' });
  // Center
  objs.push({ type: 'glow', x: cx, y: cy, radius: 70, color: '#00ccff', opacity: 0.1 });
  objs.push({ type: 'circle', x: cx, y: cy, radius: 38, color: '#00ccff', glow: true, label: topic.substring(0, 18), fontSize: 10, info: `Core concept: ${topic}` });
  // Nodes
  const show = phase === 0 ? Math.min(2, words.length) : phase === 1 ? Math.min(4, words.length) : words.length;
  for (let i = 0; i < show; i++) {
    const a = (i / Math.max(words.length, 1)) * TAU + t * 0.15;
    const dist = 120 + Math.sin(t * 0.5 + i * 2) * 12;
    const nx = cx + Math.cos(a) * dist, ny = cy + Math.sin(a) * dist;
    // Connection line
    if (phase >= 2) {
      objs.push({ type: 'line', x: cx, y: cy, x2: nx, y2: ny, color: colors[i % colors.length], opacity: 0.15 });
      // Traveling particle
      const p = ((t * 0.4 + i * 0.2) % 1);
      objs.push({ type: 'circle', x: lerp(cx, nx, p), y: lerp(cy, ny, p), radius: 2.5, color: colors[i % colors.length], pulse: true, opacity: 0.8 });
    }
    objs.push({ type: 'circle', x: nx, y: ny, radius: 20, color: colors[i % colors.length], glow: true, label: words[i], fontSize: 9, info: `Concept: ${words[i]}` });
  }
  // Cross connections
  if (phase >= 3 && show >= 3) {
    for (let i = 0; i < show - 1; i++) {
      const a1 = (i / Math.max(words.length, 1)) * TAU + t * 0.15, a2 = ((i + 1) / Math.max(words.length, 1)) * TAU + t * 0.15;
      const d = 120;
      objs.push({ type: 'line', x: cx + Math.cos(a1) * d, y: cy + Math.sin(a1) * d, x2: cx + Math.cos(a2) * d, y2: cy + Math.sin(a2) * d, color: 'rgba(255,255,255,0.06)' });
    }
  }
  return objs;
}

// ---- PHASES PER TOPIC ----
function getPhases(topic: string): AnimPhase[] {
  const t = topic.toLowerCase();
  if (t.includes('solar') || t.includes('planet') || t.includes('orbit'))
    return [
      { label: 'The Sun', narration: `At the center of our solar system lies the Sun — a massive star that provides light and heat. It contains 99.8% of all mass in the solar system.` },
      { label: 'Rocky Planets', narration: `The inner planets — Mercury, Venus, Earth, and Mars — are small, rocky worlds. Earth is unique with liquid water and life. Mars has ice caps and the tallest volcano.` },
      { label: 'Gas Giants', narration: `Jupiter and Saturn are enormous gas giants. Jupiter's Great Red Spot is a storm larger than Earth. Saturn's iconic rings are made of billions of ice particles.` },
      { label: 'Orbital Mechanics', narration: `All planets orbit the Sun due to gravity. Inner planets move faster — Mercury completes an orbit in 88 days, while Saturn takes 29 years.` },
    ];
  if (t.includes('atom') || t.includes('electron') || t.includes('proton'))
    return [
      { label: 'The Nucleus', narration: `Every atom has a dense nucleus at its center, containing positively charged protons and electrically neutral neutrons, held together by the strong nuclear force.` },
      { label: 'First Shell', narration: `Electrons orbit the nucleus in energy shells. The first shell, closest to the nucleus, can hold a maximum of 2 electrons.` },
      { label: 'Electron Shells', narration: `The second shell holds up to 8 electrons. These energy levels determine an element's chemical behavior and how it bonds with other atoms.` },
      { label: 'Complete Atom', narration: `The outermost shell contains valence electrons — they determine chemical reactivity. Atoms bond to achieve a full outer shell, following the octet rule.` },
    ];
  if (t.includes('photosynth') || t.includes('chloro') || t.includes('plant'))
    return [
      { label: 'Light Capture', narration: `Photosynthesis begins when sunlight reaches plant leaves. Chlorophyll, the green pigment inside chloroplasts, absorbs light energy — mostly red and blue wavelengths.` },
      { label: 'Inputs', narration: `The plant takes in carbon dioxide through tiny pores called stomata on its leaves, and absorbs water through its root system from the soil.` },
      { label: 'The Reaction', narration: `Inside chloroplasts, light energy drives a chemical reaction: CO₂ and water are converted into glucose — the plant's food — and oxygen is released as a byproduct.` },
      { label: 'The Equation', narration: `The complete equation: 6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂. This single process sustains virtually all life on Earth.` },
    ];
  if (t.includes('water cycle') || t.includes('evapor') || t.includes('rain') || t.includes('hydro'))
    return [
      { label: 'Evaporation', narration: `The sun heats water in oceans, rivers, and lakes. Water molecules gain energy and escape as invisible vapor, rising into the atmosphere. This is evaporation.` },
      { label: 'Condensation', narration: `As water vapor rises and cools, it condenses around tiny dust particles forming clouds. Millions of tiny droplets cluster together in this process.` },
      { label: 'Precipitation', narration: `When cloud droplets merge and become heavy enough, they fall as precipitation — rain, snow, sleet, or hail, depending on temperature.` },
      { label: 'Collection', narration: `Fallen water collects in rivers, lakes, oceans, and underground aquifers. Some is absorbed by plants. The cycle repeats endlessly, driven by solar energy.` },
    ];
  if (t.includes('cell') || t.includes('mitochondr') || t.includes('nucleus') || t.includes('organelle'))
    return [
      { label: 'Cell Nucleus', narration: `The nucleus is the control center of the cell. It contains DNA — the genetic blueprint — and is surrounded by a double membrane called the nuclear envelope.` },
      { label: 'Energy System', narration: `Mitochondria are the powerhouses of the cell, converting glucose into ATP energy. The endoplasmic reticulum synthesizes proteins and lipids.` },
      { label: 'Protein Factory', narration: `Ribosomes build proteins from amino acids. The Golgi apparatus packages and ships these proteins to their destinations inside or outside the cell.` },
      { label: 'Living Cell', narration: `The cytoplasm fills the cell, suspending organelles. Cell membrane controls what enters and exits. Together, these components create a living, functioning unit.` },
    ];
  // Generic
  return [
    { label: 'Introduction', narration: `Let's explore ${topic}. This animated visualization will break down the key concepts and show how different elements connect together.` },
    { label: 'Core Concepts', narration: `${topic} involves several fundamental ideas. Each concept node represents a key area of knowledge. Watch as they appear and connect.` },
    { label: 'Connections', narration: `The connections between concepts reveal deeper understanding. Notice how information flows between each element — this is how experts think about ${topic}.` },
    { label: 'Complete Picture', narration: `You've now seen the full map of ${topic}. Each concept works together in a system. Understanding these relationships is the key to mastery.` },
  ];
}

function getObjects(topic: string, phase: number, t: number, w: number, h: number): AnimObj[] {
  const tl = topic.toLowerCase();
  if (tl.includes('solar') || tl.includes('planet') || tl.includes('orbit')) return solarSystem(phase, t, w, h);
  if (tl.includes('atom') || tl.includes('electron') || tl.includes('proton')) return atomStructure(phase, t, w, h);
  if (tl.includes('photosynth') || tl.includes('chloro') || tl.includes('plant')) return photosynthesis(phase, t, w, h);
  if (tl.includes('water cycle') || tl.includes('evapor') || tl.includes('rain') || tl.includes('hydro')) return waterCycle(phase, t, w, h);
  if (tl.includes('cell') || tl.includes('mitochondr') || tl.includes('organelle')) return cellBiology(phase, t, w, h);
  return genericAnimation(topic, phase, t, w, h);
}

function getBg(topic: string): [string, string] {
  const t = topic.toLowerCase();
  if (t.includes('solar') || t.includes('planet')) return ['#020012', '#0a0a2e'];
  if (t.includes('atom') || t.includes('electron')) return ['#000814', '#001d3d'];
  if (t.includes('photosynth') || t.includes('plant')) return ['#001a00', '#003300'];
  if (t.includes('water') || t.includes('rain')) return ['#001529', '#003366'];
  if (t.includes('cell') || t.includes('mitochondr')) return ['#0a000a', '#1a0033'];
  return ['#0a0a1a', '#1a1a3e'];
}

// =====================
//  MAIN COMPONENT
// =====================
interface Props { topic: string; onClose: () => void; }

const AnimationEngine: React.FC<Props> = ({ topic, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [dispText, setDispText] = useState('');
  const tRef = useRef(0);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const objsRef = useRef<AnimObj[]>([]);

  const phases = getPhases(topic);
  const bg = getBg(topic);
  const total = phases.length;

  // TTS
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); setTimeout(() => { if (phase < total - 1) setPhase(p => p + 1); else setDone(true); }, 1500); };
    window.speechSynthesis.speak(u);
  }, [phase, total]);

  useEffect(() => {
    if (playing && !done) speak(phases[phase].narration);
    return () => window.speechSynthesis.cancel();
  }, [phase, playing, done]);

  // Typing effect
  useEffect(() => {
    if (done) return;
    const text = phases[phase]?.narration || '';
    setDispText('');
    let i = 0;
    const iv = setInterval(() => { if (i < text.length) { setDispText(text.substring(0, ++i)); } else clearInterval(iv); }, 20);
    return () => clearInterval(iv);
  }, [phase, done]);

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let on = true;
    const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; ctx.scale(2, 2); };
    resize();

    const draw = () => {
      if (!on) return;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      if (playing) tRef.current += 0.016 * speed;
      // BG
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.015)'; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const objects = getObjects(topic, phase, tRef.current, w, h);
      objsRef.current = objects;

      objects.forEach(o => {
        ctx.save();
        ctx.globalAlpha = o.opacity ?? 1;
        if (o.type === 'glow') {
          const rg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius || 50);
          rg.addColorStop(0, o.color); rg.addColorStop(1, 'transparent');
          ctx.fillStyle = rg; ctx.fillRect(o.x - (o.radius || 50), o.y - (o.radius || 50), (o.radius || 50) * 2, (o.radius || 50) * 2);
        } else if (o.type === 'circle') {
          if (o.glow) { ctx.shadowBlur = 25; ctx.shadowColor = o.color; }
          ctx.beginPath();
          const r = o.radius || 8;
          const pr = o.pulse ? r + Math.sin(tRef.current * 4) * 1.5 : r;
          ctx.arc(o.x, o.y, pr, 0, TAU);
          ctx.fillStyle = o.color; ctx.fill();
          // hover ring
          const d = Math.sqrt((mouseRef.current.x - o.x) ** 2 + (mouseRef.current.y - o.y) ** 2);
          if (d < r + 12 && o.info) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
          ctx.shadowBlur = 0;
          if (o.label) { ctx.fillStyle = '#fff'; ctx.font = `bold ${o.fontSize || 10}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(o.label, o.x, o.y + (r + 14)); }
        } else if (o.type === 'ring') {
          ctx.beginPath(); ctx.arc(o.x, o.y, o.radius || 50, 0, TAU); ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.stroke();
        } else if (o.type === 'rect') {
          ctx.fillStyle = o.color; ctx.fillRect(o.x, o.y, o.w || 10, o.h || 10);
        } else if (o.type === 'label') {
          ctx.fillStyle = o.color; ctx.font = `bold ${o.fontSize || 12}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(o.label || '', o.x, o.y);
        } else if (o.type === 'line') {
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x2 || 0, o.y2 || 0); ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
      });
      // Phase label
      ctx.globalAlpha = 0.4; ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`Phase ${phase + 1}/${total}: ${phases[phase]?.label}`, 16, 24); ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { on = false; cancelAnimationFrame(frameRef.current); };
  }, [phase, playing, speed, done, topic]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    mouseRef.current = { x: mx, y: my };
    let found: string | null = null;
    objsRef.current.forEach(o => { if (o.info && o.type === 'circle') { const d = Math.sqrt((mx - o.x) ** 2 + (my - o.y) ** 2); if (d < (o.radius || 8) + 12) found = o.info; } });
    setHover(found);
  }, []);

  const go = (i: number) => { window.speechSynthesis.cancel(); setDone(false); setPhase(i); };
  const toggle = () => { if (playing) { window.speechSynthesis.cancel(); setSpeaking(false); } setPlaying(!playing); };
  const replay = () => { setDone(false); setPhase(0); setPlaying(true); };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-black/80 border-b border-white/10 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white font-bold text-sm">🎬 {topic}</span>
          <span className="text-white/20 text-xs">|</span>
          <span className="text-white/30 text-xs">Interactive 3D Animation Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/25 text-xs">Speed</span>
          {[0.5, 1, 1.5, 2].map(s => (
            <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${speed === s ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white'}`}>{s}x</button>
          ))}
          <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="ml-3 text-white/40 hover:text-white text-xs bg-white/5 hover:bg-white/15 px-4 py-1.5 rounded-lg border border-white/10 transition-all">✕ Close</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} onMouseMove={onMouseMove} className="w-full h-full cursor-crosshair" />
        {hover && (
          <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl px-5 py-3 max-w-xs z-10">
            <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-1">ℹ️ Details</p>
            <p className="text-white text-sm">{hover}</p>
          </div>
        )}
        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur rounded-xl px-3 py-1.5 border border-white/5 z-10">
          <p className="text-white/25 text-[9px] font-bold uppercase tracking-widest">👆 Hover objects for details</p>
        </div>
        {done && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-20">
            <div className="text-center space-y-5">
              <div className="text-6xl">🎓</div>
              <h2 className="text-3xl font-black text-white">Animation Complete!</h2>
              <p className="text-white/40">{topic} • {total} phases</p>
              <div className="flex gap-3 justify-center mt-5">
                <button onClick={replay} className="px-7 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all">🔄 Replay</button>
                <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="px-7 py-2.5 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-all">✓ Done</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="bg-black/90 border-t border-white/10 backdrop-blur-xl px-5 py-3 z-20 space-y-2">
        <div className={`flex items-start gap-3 transition-all ${speaking ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex gap-0.5 pt-1 flex-shrink-0">
            {[...Array(5)].map((_, i) => <div key={i} className="w-1 bg-cyan-500 rounded-full" style={{ height: speaking ? `${6 + Math.random() * 14}px` : '4px', animation: speaking ? `ab 0.3s ease ${i * 0.07}s infinite alternate` : 'none' }} />)}
          </div>
          <p className="text-white/70 text-sm leading-relaxed flex-1">{dispText}<span className="inline-block w-0.5 h-4 bg-cyan-500/50 ml-0.5 animate-pulse" /></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {phases.map((p, i) => (
              <button key={i} onClick={() => go(i)} title={p.label} className="group relative w-3 h-3 rounded-full transition-all hover:scale-150"
                style={{ background: i === phase ? '#00ccff' : i < phase ? '#00ccff80' : 'rgba(255,255,255,0.12)', boxShadow: i === phase ? '0 0 10px #00ccff80' : 'none' }}>
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[8px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((phase + 1) / total) * 100}%`, background: 'linear-gradient(90deg,#00ccff,#0066ff)', boxShadow: '0 0 10px #00ccff60' }} />
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => phase > 0 && go(phase - 1)} disabled={phase === 0} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white text-xs flex items-center justify-center disabled:opacity-20">◀</button>
            <button onClick={toggle} className="w-9 h-9 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/40 text-white font-bold flex items-center justify-center text-sm">{playing ? '⏸' : '▶'}</button>
            <button onClick={() => phase < total - 1 && go(phase + 1)} disabled={phase >= total - 1} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white text-xs flex items-center justify-center disabled:opacity-20">▶</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes ab { from { height: 4px } to { height: 20px } }`}</style>
    </div>
  );
};

export default AnimationEngine;
