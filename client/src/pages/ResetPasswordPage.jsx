import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MdSportsCricket } from 'react-icons/md';
import { HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineCheckCircle, HiOutlineKey } from 'react-icons/hi';

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  
  const email = location.state?.email;
  
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // If no email was passed in state, redirect back to forgot password
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const res = await api.post(`/auth/reset-password`, {
        email,
        otp,
        password,
        confirmPassword,
      });

      // Auto-login the user with the returned token
      if (res.data.token) {
        localStorage.setItem('sportify_token', res.data.token);
        localStorage.setItem('sportify_user', JSON.stringify(res.data.user));
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. OTP may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null; // Prevent flicker while redirecting

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
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!success ? (
            <>
              <h2 className="text-xl font-bold text-txt-primary mb-1">Verify Reset OTP</h2>
              <p className="text-txt-muted text-sm mb-6">
                Enter the 6-digit OTP sent to <span className="font-semibold">{email}</span> and your new password.
              </p>

              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3 mb-4 animate-fade-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="otp">6-Digit OTP</label>
                  <div className="relative">
                    <HiOutlineKey className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input pl-10 tracking-widest text-lg font-mono font-bold"
                      placeholder="123456"
                      required
                      minLength={6}
                      maxLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="new-password">New Password</label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10 pr-10"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary">
                      {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="confirm-new-password">Confirm New Password</label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                    <input
                      id="confirm-new-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input pl-10"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-danger text-xs animate-fade-in">Passwords do not match</p>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                  {loading ? (
                    <span className="inline-flex items-center space-x-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Resetting...</span>
                    </span>
                  ) : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <HiOutlineCheckCircle className="text-4xl text-accent" />
              </div>
              <h2 className="text-xl font-bold text-txt-primary mb-2">Password Reset!</h2>
              <p className="text-txt-muted text-sm">
                Your password has been reset successfully. Redirecting to login...
              </p>
            </div>
          )}

          <p className="text-center text-sm text-txt-muted mt-6">
            <Link to="/forgot-password" className="text-secondary hover:text-secondary-dark font-medium">
              ← Request a new OTP
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
