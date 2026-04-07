import { LoginForm } from '@/components/LoginForm';

const features = [
  ['Linear-style clarity', 'Soft surfaces, quiet hierarchy, and high signal density for busy field and operations teams.'],
  ['Metadata capture', 'Auto-reads embedded GPS and address-style metadata from uploaded photos when present.'],
  ['Operational routing', 'Region, state, FFO, and department views for fulfillment, line, and supervisors.'],
  ['Standalone deploy', 'Runs on any Linux box with Node and PostgreSQL, including Raspberry Pi-class hosts.'],
];

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="card hero-copy">
          <div className="badge">Cable drop operations portal</div>
          <h1 className="h1">Clean field reporting for cut, trapped, and hazardous drops.</h1>
          <p className="lead">
            Upload drop photos, pull GPS and address-style metadata from image files, and review incidents in a
            Linear-inspired interface built for technicians and leadership.
          </p>
          <div className="grid-2">
            {features.map(([title, copy]) => (
              <div key={title} className="card feature">
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
