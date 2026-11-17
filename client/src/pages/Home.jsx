import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  {
    number: '01',
    title: 'See the whole picture',
    description: 'Get a clear, real-time view of sales, revenue, and what needs your attention.',
    tone: 'mint',
  },
  {
    number: '02',
    title: 'Stay on top of stock',
    description: 'Keep your products organized and know when it is time to restock.',
    tone: 'peach',
  },
  {
    number: '03',
    title: 'Make every sale count',
    description: 'Record transactions quickly and understand how your business is performing.',
    tone: 'lavender',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const actionHref = user ? '/dashboard' : '/login';
  const actionLabel = user ? 'Go to dashboard' : 'Get started';

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="bussiness-app home">
          <span className="landing-brand-mark" aria-hidden="true">b.</span>
          <span>bussiness<span>-app</span></span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>
        <div className="landing-actions">
          {!loading && user ? (
            <Link to="/dashboard" className="landing-signin">Dashboard</Link>
          ) : (
            <Link to="/login" className="landing-signin">Sign in</Link>
          )}
          <Link to={actionHref} className="landing-button landing-button-small">
            {actionLabel}<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="about">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span /> YOUR BUSINESS, IN GOOD HANDS</div>
            <h1>Make room for<br />the <span>big picture.</span></h1>
            <p className="landing-intro">
              A clearer way to run your business. Bring sales, products, and the details
              that matter together in one beautifully simple place.
            </p>
            <div className="landing-hero-actions">
              <Link to={actionHref} className="landing-button">
                {actionLabel}<span aria-hidden="true">↗</span>
              </Link>
              <a href="#features" className="landing-text-link">
                Take a look <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="landing-social-proof">
              <div className="landing-avatar-stack" aria-hidden="true">
                <span>J</span><span>M</span><span>A</span><span>+</span>
              </div>
              <p><strong>One simple workspace</strong><br />for your day-to-day business</p>
            </div>
          </div>

          <div className="landing-visual" aria-label="Business overview dashboard preview">
            <div className="landing-orbit landing-orbit-one" />
            <div className="landing-orbit landing-orbit-two" />
            <div className="preview-card">
              <div className="preview-topline">
                <div>
                  <span className="preview-overline">YOUR OVERVIEW</span>
                  <h2>Looking good.</h2>
                </div>
                <span className="preview-menu" aria-hidden="true">•••</span>
              </div>
              <div className="preview-metrics">
                <div className="preview-metric preview-metric-highlight">
                  <span>Revenue</span><strong>Growing steadily</strong>
                  <div className="preview-chart" aria-hidden="true">
                    {[28, 42, 34, 55, 45, 70, 61, 82, 68, 96, 78, 100].map((height, index) => (
                      <i key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <small><span>↗</span> Your business at a glance</small>
                </div>
                <div className="preview-side-metrics">
                  <div className="preview-metric">
                    <span>Sales</span><strong>All in one place</strong>
                    <div className="preview-mini-line" aria-hidden="true"><i /></div>
                  </div>
                  <div className="preview-metric">
                    <span>Inventory</span><strong>Stay in the know</strong>
                    <div className="preview-stock" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                  </div>
                </div>
              </div>
              <div className="preview-footer">
                <span className="preview-status-dot" /> Everything you need, right where you need it
              </div>
            </div>
            <div className="landing-float-card">
              <span className="landing-float-icon" aria-hidden="true">✦</span>
              <span><strong>Less busywork</strong><small>More time for what’s next</small></span>
            </div>
            <span className="landing-spark landing-spark-one" aria-hidden="true">✳</span>
            <span className="landing-spark landing-spark-two" aria-hidden="true">✦</span>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="landing-section-heading">
            <div>
              <div className="landing-eyebrow"><span /> MADE FOR YOUR EVERYDAY</div>
              <h2>Good business<br />starts with clarity.</h2>
            </div>
            <p>Less time chasing details. More confidence in every decision. The tools you need, without the clutter.</p>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article className={`landing-feature-card ${feature.tone}`} key={feature.number}>
                <span className="landing-feature-number">{feature.number}</span>
                <div className="landing-feature-mark" aria-hidden="true">
                  {feature.number === '01' ? '◒' : feature.number === '02' ? '▤' : '↗'}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Link to="/" className="landing-brand">
          <span className="landing-brand-mark" aria-hidden="true">b.</span>
          <span>bussiness<span>-app</span></span>
        </Link>
        <p>A little more clarity, every day.</p>
        <Link to={actionHref}>{user ? 'Open your dashboard' : 'Sign in'} <span aria-hidden="true">↗</span></Link>
      </footer>
    </div>
  );
}
