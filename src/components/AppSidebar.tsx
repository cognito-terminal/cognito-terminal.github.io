
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import AppSidebarHeader from "@/components/sidebar/SidebarHeader";
import SidebarNavMenu from "@/components/sidebar/SidebarNavMenu";
import SidebarGroupsList from "@/components/sidebar/SidebarGroupsList";
import SidebarUserFooter from "@/components/sidebar/SidebarUserFooter";

const AppSidebar = () => {
  return (
    <Sidebar className="bg-terminal border-r border-terminal-border">
      <AppSidebarHeader />
      <SidebarContent className="terminal-scrollbar">
        <SidebarNavMenu />
        <SidebarGroupsList />
      </SidebarContent>
      <SidebarUserFooter />
    </Sidebar>
  );
};

export default AppSidebar;
