import { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [activePage, setActivePage] = useState("overview");

    return (
        <div className="app-wrapper">
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
                activePage={activePage}
                onNavigate={setActivePage}
            />
            <main className={`main ${collapsed ? "expanded" : ""}`}>
                {/* Pass activePage down to children (Dashboard) via render prop */}
                {typeof children === "function"
                    ? children({ activePage })
                    : children}
            </main>
        </div>
    );
}