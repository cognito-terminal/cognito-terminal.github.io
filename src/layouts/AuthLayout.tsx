
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AuthLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-terminal p-4">
        <div className="text-terminal-foreground text-xl">
          <span className="cursor">Initializing authentication module...</span>
        </div>
      </div>
    );
  }

  // If user is already authenticated, redirect to app
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-terminal p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-terminal-foreground">
            <span>C</span>
            <span className="animate-text-glitch">o</span>
            <span>gnito</span>
          </h1>
          <p className="text-terminal-foreground/70">Secure terminal communications</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
