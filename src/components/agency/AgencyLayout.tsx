import { Outlet } from "react-router";
import AgencySidebar from "./AgencySidebar";

export default function AgencyLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <AgencySidebar />
      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
