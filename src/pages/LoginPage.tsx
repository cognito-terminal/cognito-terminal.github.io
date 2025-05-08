
import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const LoginPage = () => {
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(formData.email, formData.password);
  };

  return (
    <div className="bg-terminal-muted p-6 rounded-md shadow-lg border border-terminal-border">
      <h2 className="text-xl font-semibold mb-4 text-terminal-foreground">Terminal Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-terminal-foreground/80 mb-1">
            Email:
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full bg-terminal border border-terminal-border text-terminal-foreground"
            placeholder="operative@cognito.net"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm text-terminal-foreground/80 mb-1">
            Password:
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full bg-terminal border border-terminal-border text-terminal-foreground"
            placeholder="************"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
        >
          {loading ? (
            <span>Authenticating...</span>
          ) : (
            <span>Authenticate</span>
          )}
        </Button>
      </form>
      
      <div className="mt-4 text-center text-sm">
        <p className="text-terminal-foreground/70">
          New operative? {" "}
          <Link to="/register" className="text-terminal-foreground hover:underline">
            Register terminal access
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
