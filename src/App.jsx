import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import FundDetails from './pages/FundDetails';
import Market from './pages/Market';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import PaymentPage from './pages/PaymentPage';
import PaymentStatus from './pages/PaymentStatus';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Refunds from './pages/Refunds';
import Settings from './pages/Settings';
import StockDetails from './pages/StockDetails';
import Watchlist from './pages/Watchlist';

const PlaceholderPage = ({ title }) => (
  <div className="p-8 text-white">
    <h1 className="text-3xl font-bold mb-4">{title}</h1>
    <p className="text-muted">Coming soon...</p>
  </div>
);

const AuthenticatedLayout = ({ children }) => (
  <div className="min-h-screen bg-background text-text font-sans selection:bg-primary/30 selection:text-primary">
    <Sidebar />
    <Header />
    <main className="ml-64 p-8 min-h-[calc(100vh-5rem)]">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Dashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/fund/:id" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <FundDetails />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/stock/:name" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <StockDetails />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/watchlist" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Watchlist />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/market" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Market />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Profile />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/portfolio" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PlaceholderPage title="My Portfolio" />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/payment" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PaymentPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/payment/status" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PaymentStatus />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Settings />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/contact" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Contact />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/terms" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Terms />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />

            <Route path="/refunds" element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Refunds />
                </AuthenticatedLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
