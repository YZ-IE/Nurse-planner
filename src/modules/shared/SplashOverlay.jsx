/**
 * SplashOverlay.jsx
 * Splash JS affiché ~700ms au démarrage.
 * Le splash natif est masqué via launchShowDuration:0 dans capacitor.config.json
 */
import { useEffect, useState } from 'react';
import { loadDarkPref } from '../../theme.js';

export default function SplashOverlay({ onDone }) {
  const [fading, setFading] = useState(false);
  const [gone,   setGone]   = useState(false);
  const dark = loadDarkPref();

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true),  650);
    const t2 = setTimeout(() => { setGone(true); onDone?.(); }, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  const bg  = dark ? '#0D1117' : '#F0F3F8';
  const txt = dark ? '#F0F4FA' : '#0D1117';
  const mut = dark ? '#5A6880' : '#8D97A8';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:bg,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:16,
      opacity: fading ? 0 : 1,
      transition:'opacity 350ms ease',
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      <div style={{
        width:72, height:72, borderRadius:20,
        background: dark ? '#161C26' : '#FFFFFF',
        border:`1px solid ${dark?'#232D3F':'#E4E9F2'}`,
        boxShadow: dark?'0 4px 24px rgba(0,0,0,.4)':'0 4px 24px rgba(0,0,0,.08)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
      }}>⚕️</div>

      <div style={{textAlign:'center'}}>
        <div style={{fontSize:28,fontWeight:800,color:txt,letterSpacing:'-.8px',fontFamily:"'DM Sans',system-ui,sans-serif",lineHeight:1}}>
          N-Planr
        </div>
        <div style={{fontSize:11,color:mut,marginTop:6,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase'}}>
          Soins · Urgences · Formation
        </div>
      </div>

      <div style={{width:48,height:3,borderRadius:100,background:dark?'#232D3F':'#E4E9F2',overflow:'hidden',marginTop:8}}>
        <div style={{height:'100%',borderRadius:100,background:'#38B6FF',animation:'splashBar .65s ease both'}}/>
      </div>
      <style>{'@keyframes splashBar{from{width:0}to{width:100%}}'}</style>
    </div>
  );
}
