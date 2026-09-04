'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Incorrect username or password.');
    } else {
      router.push('/admin');
    }
  }

  return (
    <section className="section container">
      <div className="contact-page__inner">
        <h1>Admin Login</h1>
        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-row">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-row">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input"
            />
          </div>
          {error && (
            <p role="alert" className="form-section-note">{error}</p>
          )}
          <button type="submit" className="btn btn--primary">Log in</button>
        </form>
      </div>
    </section>
  );
}