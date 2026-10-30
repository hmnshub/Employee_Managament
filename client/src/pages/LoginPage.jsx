import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { LoginForm } from '../components/LoginForm.jsx';

export function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-standalone-wrapper">
        <div className="login-standalone-nav">
          <Link to="/" className="login-back-link">
            <ArrowLeft size={15} />
            <span>Back to Platform Overview</span>
          </Link>
        </div>

        <LoginForm inHero={false} />

        <div className="login-standalone-footer">
          <p>Employee Self-Service Portal &bull; Enterprise Edition</p>
        </div>
      </div>
    </div>
  );
}
