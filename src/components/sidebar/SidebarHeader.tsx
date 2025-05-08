
import {
  SidebarHeader,
} from "@/components/ui/sidebar";

const AppSidebarHeader = () => {
  return (
    <SidebarHeader className="text-terminal-foreground">
      <div className="flex items-center p-4">
        <span className="text-xl font-bold">
          Cognito<span className="text-terminal-foreground animate-cursor-blink">_</span>
        </span>
      </div>
    </SidebarHeader>
  );
};

export default AppSidebarHeader;
