export default function Sidebar({ collapsed, onToggle, activePage, onNavigate }) {
    const navItems = [
        { id: "overview", icon: "bi-grid-1x2", label: "Overview" },
        { id: "analytics", icon: "bi-graph-up-arrow", label: "Analytics" },
        { id: "charts", icon: "bi-bar-chart-line", label: "Charts" },
    ];

    return (
        <>
            {/* Mobile backdrop */}
            {!collapsed && (
                <div className="sidebar-backdrop" onClick={onToggle} />
            )}

            <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
                <div className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
                    <i className={`bi bi-chevron-${collapsed ? "right" : "left"}`}></i>
                </div>

                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <i className="bi bi-recycle"></i>
                    </div>
                    <div>
                        <div className="logo-text">EcoPackAI</div>
                        <div className="logo-sub">v2.0</div>
                    </div>
                </div>

                <nav>
                    <div className="nav-label">Navigation</div>
                    {navItems.map(item => (
                        <a
                            key={item.id}
                            className={activePage === item.id ? "active" : ""}
                            onClick={() => onNavigate(item.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === "Enter" && onNavigate(item.id)}
                        >
                            <i className={`bi ${item.icon}`}></i>
                            <span>{item.label}</span>
                        </a>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="status-dot"></div>
                    <span className="status-text">API Connected</span>
                </div>
            </aside>
        </>
    );
}