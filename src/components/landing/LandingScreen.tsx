import { ArrowRight, Fingerprint, ScanFace, ShieldCheck } from 'lucide-react'
import { BRAND } from '../../config/branding'

export function LandingScreen({ onStart }: { onStart: () => void }) {
  return <main className="landing-page">
    <header className="site-header"><div className="brand-lockup"><span className="brand-icon"><ScanFace size={18}/></span><span>{BRAND.name}</span></div><span className="brand-studio">A JOEY LABS EXPERIMENT</span></header>
    <section className="landing-hero">
      <div className="hero-copy"><p className="eyebrow"><i/> A LITTLE SELF DISCOVERY</p><h1>Find your<br/><em>frequency.</em></h1><p className="hero-intro">A real-time face mesh experience, made to run right here on your device. No identity matching. Just a closer look.</p>
        <button className="start-button" onClick={onStart}><span>Enter the scanner</span><i><ArrowRight size={18}/></i></button>
        <div className="permission-note"><Fingerprint size={16}/><span>Your camera starts only when you tap above.</span></div>
      </div>
      <div className="hero-visual" aria-hidden="true"><div className="visual-disc"/><div className="visual-ring ring-one"/><div className="visual-ring ring-two"/><div className="visual-scan"><ScanFace size={114} strokeWidth={0.75}/><span/><i/></div><div className="visual-corner corner-a"/><div className="visual-corner corner-b"/><div className="visual-label label-a">LOCAL PROCESSING<br/>FACE LANDMARKS / 478</div><div className="visual-label label-b">JOEY LABS &nbsp;·&nbsp; Nº 001</div></div>
    </section>
    <section className="landing-details"><div className="detail-heading"><span>ON DEVICE. BY DESIGN.</span><h2>A little magic.<br/><em>Kept to yourself.</em></h2></div><div className="detail-copy"><p>{BRAND.privacy}</p><div className="detail-badges"><span><ShieldCheck size={16}/> No image uploads</span><span><Fingerprint size={16}/> No face recognition</span></div><small>Camera access is requested only after you press “Enter the scanner.” Use HTTPS or localhost.</small></div></section>
    <footer className="landing-footer"><span>{BRAND.name}</span><span>MADE WITH CURIOSITY BY {BRAND.studio}</span><span>01 / 01</span></footer>
  </main>
}
