import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/auth/AuthContext';
import { dataStore } from '@/data/store';
import { cn } from '@/lib/utils';
import logo from "../assets/logo/logo.png"

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
}

export function DashboardLayout({ children, navItems, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = user ? dataStore.getNotifications(user.id) : [];
  const unreadCount = user ? dataStore.getUnreadNotificationCount(user.id) : 0;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleMarkAllRead = () => {
    if (user) {
      dataStore.markAllNotificationsRead(user.id);
      setShowNotifications(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            {/* <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <i className="fas fa-truck-fast text-sidebar-primary-foreground text-lg"></i>
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">RouteX</span> */}
            <img src={logo} alt="" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn("nav-link", isActive && "nav-link-active")}
                onClick={() => setIsSidebarOpen(false)}
              >
                <i className={cn(item.icon, "w-5 text-center")}></i>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <i className="fas fa-user text-sidebar-foreground"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <i className="fas fa-sign-out-alt w-5 text-center"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <i className="fas fa-bell text-lg text-muted-foreground"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="font-semibold">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-sm text-accent hover:text-accent/80"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-center text-muted-foreground">No notifications</p>
                        ) : (
                          notifications.slice(0, 5).map((notif) => (
                            <div
                              key={notif.id}
                              className={cn(
                                "px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors",
                                !notif.read && "bg-accent/5"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                  notif.type === 'success' && "bg-success/15 text-success",
                                  notif.type === 'warning' && "bg-warning/15 text-warning",
                                  notif.type === 'info' && "bg-info/15 text-info"
                                )}>
                                  <i className={cn(
                                    "fas text-sm",
                                    notif.type === 'success' && "fa-check",
                                    notif.type === 'warning' && "fa-exclamation",
                                    notif.type === 'info' && "fa-info"
                                  )}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{notif.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Avatar */}
              <Link 
                to={`/${user?.role}/profile`}
                className="hidden sm:flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center group-hover:bg-primary/80 transition-colors cursor-pointer">
                  <i className="fas fa-user text-primary-foreground text-sm"></i>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
