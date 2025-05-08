
import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const RegisterPage = () => {
  const { signUp, loading } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Security protocols require matching passwords",
        variant: "destructive",
      });
      return;
    }
    
    await signUp(formData.email, formData.password, formData.username);
  };

  return (
    <div className="bg-terminal-muted p-6 rounded-md shadow-lg border border-terminal-border">
      <h2 className="text-xl font-semibold mb-4 text-terminal-foreground">New Terminal Access</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm text-terminal-foreground/80 mb-1">
            Username:
          </label>
          <Input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            className="w-full bg-terminal border border-terminal-border text-terminal-foreground"
            placeholder="hackerman"
          />
        </div>
        
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
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-terminal-foreground/80 mb-1">
            Confirm Password:
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
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
            <span>Processing...</span>
          ) : (
            <span>Register Terminal Access</span>
          )}
        </Button>
      </form>
      
      <div className="mt-4 text-center text-sm">
        <p className="text-terminal-foreground/70">
          Already registered? {" "}
          <Link to="/login" className="text-terminal-foreground hover:underline">
            Login to terminal
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
