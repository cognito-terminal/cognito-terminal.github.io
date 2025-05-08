import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal p-4">
      <div className="w-full max-w-md bg-terminal-muted rounded-xl border border-terminal-border shadow-lg p-6 sm:p-8 text-center">
        <img
          src="https://raw.githubusercontent.com/BorneLabs/SAS.4-COGNITO-APP/main/Credentials/greenguy.gif"
          alt="404 GIF"
          className="w-full h-auto mb-4 rounded"
        />
        <h1 className="text-3xl sm:text-4xl font-mono font-bold text-terminal-foreground mb-2">
          COGNITO
        </h1>
        <div className="text-lg sm:text-xl mb-4 text-terminal-foreground/80 font-mono">
          TERMINAL
        </div>
        <div className="mb-6 text-terminal-foreground/70 text-left font-mono text-sm sm:text-base">
          <p className="mb-2">{">"} BASH : cd ./home</p>
          <p className="mb-2">
            {">"} PATH:{" "}
            <span className="text-terminal-foreground">{location.pathname}</span>
          </p>
          <p>{">"} <span className="cursor">Awaiting further instructions...</span></p>
        </div>
        <Button
          onClick={() => navigate("/")}
          className="w-full bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
        >
          Run Command
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
