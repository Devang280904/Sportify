import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdSportsCricket } from 'react-icons/md';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await signup({ name: formData.name, email: formData.email, password: formData.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-primary flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <MdSportsCricket className="text-4xl text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            SPORT<span className="text-accent">IFY</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-txt-primary mb-1">Get Started</h2>
          <p className="text-txt-muted text-sm mb-6">Create a free account</p>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3 mb-4 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Full Name</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input id="name" name="name" type="text" value={formData.name}
                  onChange={handleChange} className="input pl-10" placeholder="John Doe" required />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="signup-email">Email</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input id="signup-email" name="email" type="email" value={formData.email}
                  onChange={handleChange} className="input pl-10" placeholder="you@example.com" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="signup-password">Password</label>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                  <input id="signup-password" name="password" type="password" value={formData.password}
                    onChange={handleChange} className="input pl-10" placeholder="••••••" required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="confirm-password">Confirm</label>
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                  <input id="confirm-password" name="confirmPassword" type="password" value={formData.confirmPassword}
                    onChange={handleChange} className="input pl-10" placeholder="••••••" required />
                </div>
              </div>
            </div>



            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? (
                <span className="inline-flex items-center space-x-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Creating account...</span>
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-txt-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-secondary hover:text-secondary-dark font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
