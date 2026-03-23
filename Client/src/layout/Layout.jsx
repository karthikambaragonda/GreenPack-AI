import React, { useState } from "react";
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
                {/* Dynamically pass activePage & setActivePage to children */}
                {typeof children === "function"
                    ? children({ activePage, setActivePage })
                    : React.Children.map(children, child =>
                        React.isValidElement(child)
                            ? React.cloneElement(child, { activePage, setActivePage })
                            : child
                    )}
            </main>
        </div>
    );
}