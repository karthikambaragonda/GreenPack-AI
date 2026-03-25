export default function Sidebar({ collapsed, onToggle, activePage, onNavigate }) {
    // Updated nav items to reflect the actual dashboard flow
    const navItems = [
        { id: "overview", icon: "bi-sliders", label: "Parameters" },
        { id: "results", icon: "bi-award", label: "Recommendations" },
        { id: "analytics", icon: "bi-bar-chart-line", label: "BI Dashboard" },
        { id: "compare", icon: "bi-arrow-left-right", label: "Compare" },
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
                        <a href="/"><div className="logo-text">green<span style={{ fontWeight: 800, letterSpacing: "-0.02em" }}><span style={{ color: "#4ade80" }}>Pack</span></span>AI</div></a>
                        {/* <div className="logo-sub">v2.0</div> */}
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
