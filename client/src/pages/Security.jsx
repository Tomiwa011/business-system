const sections = [
  {
    title: 'Who can get in',
    items: [
      {
        title: 'Passwords are hashed',
        detail:
          'Passwords are stored as bcrypt hashes (cost factor 12). The real password is never saved and cannot be read back, even by an admin.',
        where: 'routes/auth.js, routes/users.js',
      },
      {
        title: 'Sessions use httpOnly cookies',
        detail:
          'Logging in sets a signed token in an httpOnly cookie that lasts 7 days. JavaScript running on the page cannot read it. The cookie is SameSite=Lax, and the Secure flag is switched on in production.',
        where: 'routes/auth.js',
      },
      {
        title: 'Sessions end when they should',
        detail:
          'Every request re-checks the database. Deactivating an account, or changing or resetting its password, ends that user\'s existing sessions immediately (using a token version number).',
        where: 'middleware/auth.js',
      },
      {
        title: 'No self sign-up',
        detail:
          'Public registration does not exist. Only an admin can create accounts. The very first admin is created with a command-line script.',
        where: 'routes/users.js, scripts/createAdmin.js',
      },
      {
        title: 'Login errors reveal nothing extra',
        detail:
          'A wrong email and a wrong password give the same message, so an attacker cannot discover which emails have accounts.',
        where: 'routes/auth.js',
      },
    ],
  },
  {
    title: 'What each person can do',
    items: [
      {
        title: 'Roles are enforced on the server',
        detail:
          'Admin and staff permissions are checked by the server on every protected route. Hiding a button in the interface is only a convenience, not the protection.',
        where: 'middleware/auth.js (requireRole)',
      },
      {
        title: 'Staff see less',
        detail:
          'Staff never receive cost prices, and they can only see their own sales. Asking for someone else\'s sale returns "not found", exactly as if it did not exist.',
        where: 'routes/products.js, routes/sales.js, routes/dashboard.js',
      },
      {
        title: 'Admins cannot lock themselves out',
        detail:
          'An admin cannot deactivate their own account or change their own role.',
        where: 'routes/users.js',
      },
    ],
  },
  {
    title: 'Protecting the data',
    items: [
      {
        title: 'Parameterised database queries',
        detail:
          'User input is always passed to PostgreSQL as parameters, never glued into SQL text, which blocks SQL injection.',
        where: 'every file in routes/',
      },
      {
        title: 'Server-side validation',
        detail:
          'Names, emails, passwords, prices, quantities and ids are validated on the server (types, ranges, whole numbers), no matter what the browser sends.',
        where: 'routes/',
      },
      {
        title: 'Sales cannot be tampered with',
        detail:
          'Prices always come from the database, never from the browser. A sale runs as one database transaction with the products locked, and any failure rolls everything back. The database itself also refuses negative stock.',
        where: 'routes/sales.js, db/schema.sql',
      },
      {
        title: 'History stays intact',
        detail:
          'Products are deactivated instead of deleted, and each sale stores the price at the time, so old sales never change.',
        where: 'routes/products.js, db/schema.sql',
      },
    ],
  },
  {
    title: 'Abuse and attack surface',
    items: [
      {
        title: 'Rate limiting',
        detail:
          'Failed logins: 10 per 15 minutes per IP. Password changes: 5 per 15 minutes. Recording sales: 30 per minute per user. Whole API: 1000 requests per 15 minutes per IP.',
        where: 'middleware/rateLimit.js',
      },
      {
        title: 'Security headers and size limits',
        detail:
          'Helmet adds standard security headers and hides the X-Powered-By header. Request bodies are limited to 100 KB.',
        where: 'index.js',
      },
      {
        title: 'Safe error handling',
        detail:
          'Errors return short, generic JSON messages. Stack traces and database details are never sent to the browser. Unknown API paths return a clean 404.',
        where: 'index.js',
      },
      {
        title: 'Safe startup',
        detail:
          'The server refuses to start if the JWT secret is missing or shorter than 32 characters, or if the database address is missing.',
        where: 'index.js',
      },
    ],
  },
];

const limitations = [
  'No two-factor authentication. Passwords only need to be 8 or more characters, with no complexity rules.',
  'There is no email-based password reset. An admin resets passwords by hand.',
  'Rate limit counters are kept in the server\'s memory. They reset when the server restarts and would not be shared if the app ran on several servers.',
  'There is no audit log recording who changed what (for example, who restocked a product or deactivated a user).',
  'There are no CSRF tokens. Protection relies on SameSite=Lax cookies and JSON-only requests, which is reasonable for this app but not the strongest option.',
  'Sessions last 7 days. There is no "log out of all devices" button, though a password change does that.',
  'Database backups are not automated by the app. They depend on the hosting provider and must be checked after deployment.',
];

export default function Security() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-gray-900">Security</h1>
      <p className="text-sm text-gray-600 mt-1 mb-6">
        How this application protects its users and data, and where those protections live in the
        code. Visible to admins only.
      </p>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-900 mb-3">{section.title}</h2>
            <ul className="space-y-4">
              {section.items.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs text-green-700"
                  >
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.detail}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Where: {item.where}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h2 className="font-semibold text-amber-900 mb-1">Known limitations</h2>
          <p className="text-sm text-amber-800 mb-3">
            What this version does not cover. Being clear about these is part of using the
            system safely.
          </p>
          <ul className="space-y-2">
            {limitations.map((text) => (
              <li key={text} className="flex gap-3 text-sm text-amber-900">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}