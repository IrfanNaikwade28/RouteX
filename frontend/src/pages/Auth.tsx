import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/auth/AuthContext';
import { UserRole } from '@/data/mockData';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';

const roleConfig: Record<UserRole, { label: string; icon: string; description: string }> = {
  client: {
    label: 'Client',
    icon: 'fa-user',
    description: 'Send and track parcels',
  },
  driver: {
    label: 'Driver',
    icon: 'fa-truck',
    description: 'Deliver parcels',
  },
  admin: {
    label: 'Admin',
    icon: 'fa-user-shield',
    description: 'Manage operations',
  },
};

export default function Auth() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Signup restriction: Only clients can register
      // Admin accounts are system-created, Driver accounts are created by Admin
      if (mode === 'signup' && selectedRole !== 'client') {
        setError('Signup is only available for Client accounts. Admin and Driver accounts must be created by the system administrator.');
        setIsLoading(false);
        return;
      }

      let result;
      if (mode === 'login') {
        result = await login(formData.email, formData.password, selectedRole); // Pass selectedRole during login
      } else {
        result = await signup(formData.name, formData.email, formData.password, selectedRole, formData.phone); // Pass selectedRole during signup
      }

      if (result.success) {
        // Navigate to appropriate dashboard
        const redirectPath = selectedRole === 'client' 
          ? '/client' 
          : selectedRole === 'driver' 
            ? '/driver' 
            : '/admin';
        navigate(redirectPath);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-sidebar flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-info/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
              <i className="fas fa-truck-fast text-accent-foreground text-xl"></i>
            </div>
            <span className="text-3xl font-bold text-primary-foreground">ParcelFlow</span>
          </div>
          <p className="text-primary-foreground/70">Smart Logistics Management</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setMode('login')}
              className={cn(
                "py-4 text-sm font-medium transition-colors",
                selectedRole !== 'client' ? "w-full" : "flex-1",
                mode === 'login' 
                  ? "text-foreground border-b-2 border-accent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign In
            </button>
            {/* Only show Signup tab for Client role */}
            {selectedRole === 'client' && (
              <button
                onClick={() => setMode('signup')}
                className={cn(
                  "flex-1 py-4 text-sm font-medium transition-colors",
                  mode === 'signup' 
                    ? "text-foreground border-b-2 border-accent" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign Up
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Select Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                  const config = roleConfig[role];
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)} // Update selectedRole
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200",
                        selectedRole === role
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 transition-colors",
                        selectedRole === role ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                      )}>
                        <i className={cn("fas", config.icon)}></i>
                      </div>
                      <p className="text-sm font-medium text-center">{config.label}</p>
                      {selectedRole === role && (
                        <motion.div
                          layoutId="role-check"
                          className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center"
                        >
                          <i className="fas fa-check text-xs text-accent-foreground"></i>
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field pl-11"
                        placeholder="John Doe"
                        required={mode === 'signup'}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field pl-11"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field pl-11"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <i className="fas fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-field pl-11"
                        placeholder="+1 555-0100"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2"
                >
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <i className="fas fa-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            {mode === 'login' && (
              <div className="mt-6 p-4 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-2">Demo Credentials:</p>
                <div className="space-y-1 text-xs">
                  <p><strong>Client:</strong> john@example.com / password123</p>
                  <p><strong>Driver:</strong> driver@test.com / driverpass123</p>
                  <p><strong>Admin:</strong> admin@test.com / adminpass123</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
