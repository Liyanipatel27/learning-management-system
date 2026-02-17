
const UserManagementSection = ({ activeTab, users, handleEditUser, handleDeleteUser, handleExport }) => {
    const [filterName, setFilterName] = useState('');
    const [filterId, setFilterId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const btnStyle = {
        padding: '8px 16px',
        background: '#3182ce',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem'
    };

    // Filter Logic
    const currentRole = activeTab.slice(0, -1);
    const filteredUsers = users.filter(u => {
        if (u.role !== currentRole) return false;

        const matchesName = u.name.toLowerCase().includes(filterName.toLowerCase());
        const idToSearch = u.role === 'student' ? (u.enrollment || '') : (u.employeeId || '');
        const matchesId = idToSearch.toString().toLowerCase().includes(filterId.toLowerCase());

        return matchesName && matchesId;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterName, filterId, activeTab]);

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>

            {/* Filter Controls */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Search by Name..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder={`🔍 Search by ${activeTab === 'students' ? 'Enrollment ID' : 'Employee ID'}...`}
                        value={filterId}
                        onChange={(e) => setFilterId(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                </div>
                <button onClick={() => {
                    let cols = [
                        { header: 'Name', key: 'name' },
                        { header: 'Email', key: 'email' },
                        { header: 'Role', accessor: (u) => u.role.toUpperCase() }
                    ];

                    if (currentRole === 'student') {
                        cols = [
                            { header: 'Enrollment ID', key: 'enrollment' },
                            ...cols,
                            { header: 'Branch', key: 'branch' }
                        ];
                    } else {
                        cols = [
                            { header: 'Employee ID', key: 'employeeId' },
                            ...cols
                        ];
                    }
                    handleExport(filteredUsers, `${activeTab}_filtered_list.csv`, cols);
                }} style={btnStyle}>📥 Export List</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>
                        <th style={{ padding: '15px' }}>Name</th>
                        <th style={{ padding: '15px' }}>Email</th>
                        <th style={{ padding: '15px' }}>Role</th>
                        <th style={{ padding: '15px' }}>{activeTab === 'students' ? 'Enrollment' : 'Employee ID'}</th>
                        {activeTab === 'students' && <th style={{ padding: '15px' }}>Branch</th>}
                        <th style={{ padding: '15px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedUsers.map(u => (
                        <tr key={u._id} style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '15px' }}>{u.name}</td>
                            <td style={{ padding: '15px' }}>{u.email}</td>
                            <td style={{ padding: '15px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: u.role === 'admin' ? '#fed7d7' : u.role === 'teacher' ? '#feebc8' : '#c6f6d5', color: '#2d3748' }}>
                                    {u.role.toUpperCase()}
                                </span>
                            </td>
                            <td style={{ padding: '15px' }}>
                                {u.role === 'student' ? u.enrollment : (u.employeeId || '-')}
                            </td>
                            {activeTab === 'students' && (
                                <td style={{ padding: '15px' }}>
                                    {u.branch || '-'}
                                </td>
                            )}
                            <td style={{ padding: '15px' }}>
                                <button onClick={() => handleEditUser(u)} style={{ color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}>Edit</button>
                                <button onClick={() => handleDeleteUser(u._id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>No {activeTab} found matching criteria.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredUsers.length > ITEMS_PER_PAGE && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: currentPage === 1 ? '#f7fafc' : 'white',
                            color: currentPage === 1 ? '#cbd5e0' : '#4a5568',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        &lt; Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', color: '#718096' }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: currentPage === totalPages ? '#f7fafc' : 'white',
                            color: currentPage === totalPages ? '#cbd5e0' : '#4a5568',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Next &gt;
                    </button>
                </div>
            )}
        </div>
    );
};
