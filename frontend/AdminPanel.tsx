import React, { useState, useEffect } from 'react';
import { ProductsData, User, Order, ProductItem, PaymentAccountDetails } from './types';
import { MMK_PER_CREDIT } from './utils';
import { Logo, CollapsibleSection, EmptyState } from './components';
import api from './src/api';

// --- ADMIN PANEL --- //

interface AdminPanelProps {
    onNavigate: (view: string) => void;
    products: ProductsData;
    setProducts: React.Dispatch<React.SetStateAction<ProductsData>>;
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    onBroadcast: (message: string, targetIds: number[]) => void;
    currentUser: User;
    onLogout: () => void;
    paymentDetails: PaymentAccountDetails;
    setPaymentDetails: React.Dispatch<React.SetStateAction<PaymentAccountDetails>>;
    adminContact: string;
    setAdminContact: React.Dispatch<React.SetStateAction<string>>;
}

const AdminPanel = (props: AdminPanelProps) => {
    const { onNavigate, currentUser, onLogout } = props;
    const [adminView, setAdminView] = useState('DASHBOARD');
    
    const renderAdminView = () => {
        switch (adminView) {
            case 'PRODUCTS':
                return <AdminManageProducts {...props} />;
            case 'USERS':
                return <AdminManageUsers {...props} />;
            case 'ORDERS':
                return <AdminViewAllOrders {...props} />;
            case 'BROADCAST':
                return <AdminBroadcast {...props} />;
            case 'SETTINGS':
                return <AdminSiteSettings {...props} />;
            default:
                return (
                    <div className="action-cards">
                        <div className="card" onClick={() => setAdminView('PRODUCTS')}><h3>📦 Manage Products</h3><p>Add, edit, or delete products.</p></div>
                        <div className="card" onClick={() => setAdminView('USERS')}><h3>👤 Manage Users</h3><p>Adjust credits, ban, and view users.</p></div>
                        <div className="card" onClick={() => setAdminView('ORDERS')}><h3>📊 View All Orders</h3><p>Approve or decline all orders.</p></div>
                        <div className="card" onClick={() => setAdminView('BROADCAST')}><h3>📢 Broadcasts</h3><p>Send messages to users.</p></div>
                        <div className="card" onClick={() => setAdminView('SETTINGS')}><h3>⚙️ Site Settings</h3><p>Edit payment details and contact info.</p></div>
                    </div>
                );
        }
    };

    return (
         <div className="admin-container">
            <header className="dashboard-header">
                <Logo />
                <button onClick={() => onNavigate('DASHBOARD')} className="logout-button">Exit Admin</button>
            </header>
            <main className="dashboard-main">
                 {adminView !== 'DASHBOARD' && <button onClick={() => setAdminView('DASHBOARD')} className="back-button mb-1">← Admin Dashboard</button>}
                 {renderAdminView()}
            </main>
        </div>
    );
};

// --- Sub-components for AdminPanel --- //

const AdminManageProducts = ({ products, setProducts }: { products: ProductsData, setProducts: React.Dispatch<React.SetStateAction<ProductsData>> }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null); // null for new, product object for editing
    
    const productCount = Object.values(products).reduce((acc, categories) => acc + Object.values(categories).reduce((catAcc, list) => catAcc + list.length, 0), 0);

    const handleAddNew = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleEdit = (product: ProductItem) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = (product: ProductItem) => {
        if (!confirm(`Are you sure you want to delete product: ${product.name}?`)) return;
        if (!product.operator || !product.category) return;

        const newProducts = JSON.parse(JSON.stringify(products));
        const categoryProducts = newProducts[product.operator][product.category];
        const productIndex = categoryProducts.findIndex((p: ProductItem) => p.id === product.id);

        if (productIndex > -1) {
            categoryProducts.splice(productIndex, 1);
            setProducts(newProducts);
            alert('Product deleted.');
        }
    };

    const handleSave = (formData: any, originalProduct: ProductItem | null) => {
        const newProducts = JSON.parse(JSON.stringify(products));
        
        if (originalProduct && originalProduct.operator && originalProduct.category) {
            const oldCategoryList = newProducts[originalProduct.operator]?.[originalProduct.category];
            if(oldCategoryList) {
                const index = oldCategoryList.findIndex((p: ProductItem) => p.id === originalProduct.id);
                if (index > -1) oldCategoryList.splice(index, 1);
            }
        }
        
        const { operator, category, ...productDetails } = formData;
        
        if (!newProducts[operator]) newProducts[operator] = {};
        if (!newProducts[operator][category]) newProducts[operator][category] = [];
        
        newProducts[operator][category].push(productDetails);
        newProducts[operator][category].sort((a: ProductItem,b: ProductItem) => a.name.localeCompare(b.name));
        
        setProducts(newProducts);
    };
    
    return (
        <div>
            <div className="admin-header">
                <h2>Manage Products</h2>
                <button onClick={handleAddNew} className="button-add">+ Add New Product</button>
            </div>
            {productCount > 0 ? (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead><tr><th>Operator</th><th>Category</th><th>Name</th><th>ID</th><th>Price (MMK)</th><th>Actions</th></tr></thead>
                        <tbody>
                            {Object.entries(products).flatMap(([operator, categories]) => 
                                Object.entries(categories).flatMap(([category, productList]) => 
                                    productList.map(p => {
                                        const fullProduct = { ...p, operator, category };
                                        return (
                                            <tr key={p.id}>
                                                <td>{operator}</td>
                                                <td>{category}</td>
                                                <td>{p.name}</td>
                                                <td>{p.id}</td>
                                                <td>{p.price_mmk.toLocaleString()}</td>
                                                <td className="admin-actions">
                                                    <button onClick={() => handleEdit(fullProduct)} className="button-secondary">Edit</button>
                                                    <button onClick={() => handleDelete(fullProduct)} className="button-danger">Delete</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState 
                    message="No products have been added yet"
                    subMessage="Click '+ Add New Product' to get started."
                />
            )}
            <ProductEditModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                product={editingProduct}
                allProducts={products}
            />
        </div>
    );
};

const ProductEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: any, originalProduct: ProductItem | null) => void;
    product: ProductItem | null;
    allProducts: ProductsData;
}> = ({ isOpen, onClose, onSave, product, allProducts }) => {
    const isNew = product === null;
    const [formData, setFormData] = useState({
        operator: '', category: '', id: '', name: '', price_mmk: '', extra: '',
    });

    useEffect(() => {
        setFormData({
            operator: product?.operator || Object.keys(allProducts)[0] || '',
            category: product?.category || '',
            id: product?.id || `prod_${Date.now()}`,
            name: product?.name || '',
            price_mmk: String(product?.price_mmk ?? ''),
            extra: product?.extra || '',
        });
    }, [isOpen, product, allProducts]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseFloat(formData.price_mmk);
        if (isNaN(price) || price < 0) { alert('Please enter a valid price.'); return; }
        if (!formData.name || !formData.id || !formData.operator || !formData.category) { alert('Please fill in all required fields.'); return; }
        onSave({ ...formData, price_mmk: price }, product);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>{isNew ? 'Add New Product' : 'Edit Product'}</h3>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="operator">Operator</label>
                        <input id="operator" name="operator" type="text" value={formData.operator} onChange={handleChange} className="input-field" placeholder="e.g., ATOM" required />
                    </div>
                     <div className="input-group">
                        <label htmlFor="category">Category</label>
                        <input id="category" name="category" type="text" value={formData.category} onChange={handleChange} className="input-field" placeholder="e.g., Data" required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="name">Product Name</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="input-field" required />
                    </div>
                     <div className="input-group">
                        <label htmlFor="price_mmk">Price (MMK)</label>
                        <input id="price_mmk" name="price_mmk" type="number" value={formData.price_mmk} onChange={handleChange} className="input-field" required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="extra">Extra Info (Optional)</label>
                        <input id="extra" name="extra" type="text" value={formData.extra} onChange={handleChange} className="input-field" />
                    </div>
                     <div className="input-group">
                        <label htmlFor="id">Product ID</label>
                        <input id="id" name="id" type="text" value={formData.id} onChange={handleChange} className="input-field" required disabled={!isNew} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="button-secondary">Cancel</button>
                        <button type="submit" className="submit-button">Save Product</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminManageUsers: React.FC<{ 
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
    currentUser: User,
    onLogout: () => void,
}> = ({ setOrders, currentUser, onLogout }) => {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Load users from API
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await api.getAdminUsers();
                if (response.data && 'users' in response.data) {
                    setUsers((response.data as any).users);
                }
            } catch (error) {
                console.error('Failed to load users:', error);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    const selectedUser = users.find(u => u.id === selectedUserId);
    
    if (selectedUser) {
        return <AdminManageUserDetailView 
            user={selectedUser} 
            onBack={() => setSelectedUserId(null)}
            setUsers={setUsers}
            setOrders={setOrders}
            currentUser={currentUser}
            onLogout={onLogout}
        />
    }

    if (loading) {
        return <div>Loading users...</div>;
    }

    return (
        <div>
            <h2>Manage Users ({users.length} total)</h2>
            <div className="admin-add-admin-form">
                <h3>User Management</h3>
                <p>Manage user accounts and permissions through the admin panel.</p>
            </div>

            {users.length > 0 ? (
                 <div className="admin-table-container">
                    <table className="admin-table">
                        <thead><tr><th>ID</th><th>Username</th><th>Admin?</th><th>Banned?</th><th>Credits</th><th>Actions</th></tr></thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>{u.id}</td>
                                    <td>{u.username}</td>
                                    <td>{u.isAdmin ? 'Yes' : 'No'}</td>
                                    <td>{u.banned ? 'Yes' : 'No'}</td>
                                    <td>{u.credits.toFixed(2)}</td>
                                    <td className="admin-actions">
                                        <button onClick={() => setSelectedUserId(u.id)} className="button-secondary">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState message="No users found" />
            )}
        </div>
    );
};

const AdjustCreditsModal: React.FC<{
    user: User,
    onConfirm: (amount: number) => void,
    onCancel: () => void,
}> = ({ user, onConfirm, onCancel }) => {
    const [amountStr, setAmountStr] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
            alert('Invalid amount.');
            return;
        }
        onConfirm(amount);
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Adjust Credits for {user.username}</h3>
                <p>Send the amount to add or remove (e.g., 50 to add, -10 to remove).</p>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="credit-amount">Amount</label>
                        <input
                            id="credit-amount"
                            type="number"
                            step="any"
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                            className="input-field"
                            placeholder="e.g., 50 or -10"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onCancel} className="button-secondary">Cancel</button>
                        <button type="submit" className="submit-button">Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BanConfirmationModal: React.FC<{
    user: User,
    onConfirm: () => void,
    onCancel: () => void,
}> = ({ user, onConfirm, onCancel }) => {
    const action = user.banned ? 'Unban' : 'Ban';

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Confirm Action</h3>
                <p>Are you sure you want to <strong>{action}</strong> the user <strong>{user.username}</strong>?</p>
                {action === 'Ban' && <p>This will prevent them from logging in and their username cannot be re-registered.</p>}
                {action === 'Unban' && <p>This will allow them to log in again.</p>}
                <div className="modal-actions">
                    <button type="button" onClick={onCancel} className="button-secondary">Cancel</button>
                    <button onClick={onConfirm} className={action === 'Ban' ? 'button-danger' : 'button-success'} style={{padding: '0.75rem 1.5rem'}}>{action} User</button>
                </div>
            </div>
        </div>
    );
};


const AdminManageUserDetailView: React.FC<{
    user: User,
    onBack: () => void,
    setUsers: React.Dispatch<React.SetStateAction<User[]>>,
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
    currentUser: User,
    onLogout: () => void,
}> = ({ user, onBack, setUsers, setOrders, currentUser, onLogout }) => {
    const [showPurgeModal, setShowPurgeModal] = useState(false);
    const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);
    const [showBanConfirm, setShowBanConfirm] = useState(false);

    const handleConfirmAdjustCredits = (amount: number) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? { ...u, credits: u.credits + amount } : u));
        alert(`✅ Success! Credits for user ${user.id} adjusted by ${amount}.`);
        setIsAdjustingCredits(false);
    };

    const handleConfirmBan = () => {
        const actioned = user.banned ? 'unbanned' : 'banned';
        setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? { ...u, banned: !u.banned } : u));
        alert(`✅ Success! User ${user.id} has been ${actioned}.`);
        setShowBanConfirm(false);
    };
    
    const handlePurge = () => {
        // Remove the user
        setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        // Remove all orders associated with the user
        setOrders(prevOrders => prevOrders.filter(o => o.userId !== user.id));
        
        alert(`User ${user.username} and all their data has been purged.`);
        
        // If the admin purged themselves, log them out
        if (currentUser.id === user.id) {
            onLogout();
        } else {
            onBack();
        }
    };

    return (
        <div className="admin-user-detail-container">
             <div className="user-info-header">
                <h3>👤 Managing User: {user.username} ({user.id})</h3>
                <div className="user-info-details">
                    <p>💰 Credits: <span>{user.credits.toFixed(2)}</span></p>
                    <p>🚫 Banned: <span>{user.banned ? 'Yes' : 'No'}</span></p>
                </div>
            </div>

            <div className="user-action-button-list">
                <button className="user-action-button" onClick={() => setIsAdjustingCredits(true)}>💰 Adjust Credits</button>
                <button className={`user-action-button ${!user.banned ? 'danger' : ''}`} onClick={() => setShowBanConfirm(true)}>🚫 {user.banned ? 'Unban User' : 'Ban User'}</button>
                <button className="user-action-button danger darker" onClick={() => setShowPurgeModal(true)}>🗑️ Purge User Data</button>
                <button className="user-action-button" onClick={onBack}>⬅️ Back</button>
            </div>

            {isAdjustingCredits && <AdjustCreditsModal user={user} onConfirm={handleConfirmAdjustCredits} onCancel={() => setIsAdjustingCredits(false)} />}
            {showBanConfirm && <BanConfirmationModal user={user} onConfirm={handleConfirmBan} onCancel={() => setShowBanConfirm(false)} />}
            {showPurgeModal && <PurgeConfirmationModal user={user} onConfirm={handlePurge} onCancel={() => setShowPurgeModal(false)} />}
        </div>
    );
};

const PurgeConfirmationModal: React.FC<{user: User, onConfirm: () => void, onCancel: () => void}> = ({ user, onConfirm, onCancel }) => {
    const [confirmText, setConfirmText] = useState('');
    const canConfirm = confirmText === user.username;

    return (
        <div className="modal-backdrop">
            <div className="modal-content purge-confirmation">
                <h3>⚠️ Purge User Data</h3>
                <p>This is an irreversible action. It will permanently delete the user <strong>{user.username}</strong> and all of their associated orders and data.</p>
                <p>To confirm, please type the user's username below:</p>
                <div className="input-group">
                    <label htmlFor="purge-confirm-text">Username</label>
                    <input id="purge-confirm-text" type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="input-field" />
                </div>
                <div className="modal-actions">
                    <button onClick={onCancel} className="button-secondary">Cancel</button>
                    <button onClick={onConfirm} className="button-danger" disabled={!canConfirm} style={{padding: '0.75rem 1.5rem'}}>Purge Data</button>
                </div>
            </div>
        </div>
    );
};


const AdminBroadcast: React.FC<{ users: User[], onBroadcast: (message: string, targetIds: number[]) => void }> = ({ users, onBroadcast }) => {
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState('all'); // 'all' or 'specific'
    const [specificIds, setSpecificIds] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            alert('Message cannot be empty.');
            return;
        }

        let targetUserIds: number[] = [];
        if (target === 'all') {
            targetUserIds = users.map(u => u.id);
        } else {
            targetUserIds = specificIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
            if (targetUserIds.length === 0) {
                alert('Please enter at least one valid User ID.');
                return;
            }
        }
        
        onBroadcast(message, targetUserIds);
        setMessage('');
        setSpecificIds('');
    };

    return (
        <div>
            <h2>Send Broadcast</h2>
            <div className="broadcast-container">
                <form className="broadcast-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="broadcast-message">Message</label>
                        <textarea 
                            id="broadcast-message" 
                            className="textarea-field" 
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Your message to users..."
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Target Users</label>
                        <div className="targeting-options">
                            <label><input type="radio" name="target" value="all" checked={target === 'all'} onChange={() => setTarget('all')} /> All Users</label>
                            <label><input type="radio" name="target" value="specific" checked={target === 'specific'} onChange={() => setTarget('specific')} /> Specific Users</label>
                        </div>
                    </div>
                    {target === 'specific' && (
                         <div className="input-group">
                            <label htmlFor="specific-ids">User IDs (comma-separated)</label>
                            <input 
                                id="specific-ids" 
                                type="text"
                                className="input-field" 
                                value={specificIds}
                                onChange={e => setSpecificIds(e.target.value)}
                                placeholder="e.g., 123456, 987654"
                            />
                        </div>
                    )}
                    <button type="submit" className="submit-button">Send Broadcast</button>
                </form>
            </div>
        </div>
    );
};

const AdminViewAllOrders: React.FC<{
    orders: Order[];
    users: User[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentUser: User;
}> = ({ orders, users, setOrders, setUsers, currentUser }) => {
    const [viewingProof, setViewingProof] = useState<string | null>(null);

    const handleApproval = (orderToApprove: Order) => {
        const user = users.find(u => u.id === orderToApprove.userId);
        if (!user) { alert("User not found for this order."); return; }

        if (orderToApprove.type === 'CREDIT') {
            const creditsToAdd = parseFloat(orderToApprove.cost.toString()) / MMK_PER_CREDIT;
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, credits: u.credits + creditsToAdd } : u));
            alert(`Approved credit purchase. ${creditsToAdd.toFixed(2)} credits added to ${user.username}.`);
        } else {
            alert(`Approved product purchase for ${user.username}.`);
        }
        setOrders(prev => prev.map(o => o.id === orderToApprove.id ? { ...o, status: 'Completed', actionBy: currentUser.username } : o));
    };

    const handleDecline = (orderToDecline: Order) => {
        if (orderToDecline.id.startsWith('PROD')) {
            const user = users.find(u => u.id === orderToDecline.userId);
            if (user) {
                const costToRefund = parseFloat(orderToDecline.cost.toString());
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, credits: u.credits + costToRefund } : u));
                alert(`Order ${orderToDecline.id} declined. ${costToRefund.toFixed(2)} C refunded to ${user.username}.`);
            }
        } else {
             alert(`Payment request ${orderToDecline.id} has been declined.`);
        }
        setOrders(prev => prev.map(o => o.id === orderToDecline.id ? { ...o, status: 'Declined', actionBy: currentUser.username } : o));
    };

    const sortRecentFirst = (a: Order, b: Order) => new Date(b.date).getTime() - new Date(a.date).getTime();
    const pendingProductOrders = orders.filter(o => !o.type && o.status === 'Pending Approval').sort(sortRecentFirst);
    const pendingPaymentRequests = orders.filter(o => o.type === 'CREDIT' && o.status === 'Pending Approval').sort(sortRecentFirst);
    const approvedProductOrders = orders.filter(o => !o.type && o.status === 'Completed').sort(sortRecentFirst);
    const declinedProductOrders = orders.filter(o => !o.type && o.status === 'Declined').sort(sortRecentFirst);
    const approvedPaymentRequests = orders.filter(o => o.type === 'CREDIT' && o.status === 'Completed').sort(sortRecentFirst);
    const declinedPaymentRequests = orders.filter(o => o.type === 'CREDIT' && o.status === 'Declined').sort(sortRecentFirst);
    
    const renderEmptyState = (message: string) => <EmptyState message={message} subMessage="There's nothing to show here right now." />;

    const renderProductOrderTable = (orderList: Order[]) => (
         <div className="admin-table-container">
            <table className="admin-table">
                <thead><tr><th>Order ID</th><th>User</th><th>Product</th><th>Cost (C)</th><th>Deliver To</th><th>Status</th><th>Date</th><th>Action / By</th></tr></thead>
                <tbody>
                    {orderList.map(o => {
                        const user = users.find(u => u.id === o.userId);
                        return (
                            <tr key={o.id}>
                                <td>{o.id}</td>
                                <td>{user ? user.username : 'Unknown'} ({o.userId})</td>
                                <td>{o.product.name}</td>
                                <td>{o.cost.toFixed(2)} C</td>
                                <td>{o.deliveryInfo}</td>
                                <td><span className={`status-badge status-${o.status.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>{o.status}</span></td>
                                <td>{new Date(o.date).toLocaleString()}</td>
                                <td className="admin-actions">
                                    {o.status === 'Pending Approval' ? <>
                                        <button onClick={() => handleApproval(o)} className="button-success">Approve</button>
                                        <button onClick={() => handleDecline(o)} className="button-danger">Decline</button>
                                    </> : (o.actionBy || 'N/A')}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
    
    const renderPaymentRequestTable = (paymentList: Order[]) => (
         <div className="admin-table-container">
            <table className="admin-table">
                <thead><tr><th>Order ID</th><th>User</th><th>Amount (MMK)</th><th>Method</th><th>Proof</th><th>Status</th><th>Date</th><th>Action / By</th></tr></thead>
                <tbody>
                    {paymentList.map(o => {
                        const user = users.find(u => u.id === o.userId);
                        return (
                            <tr key={o.id}>
                                <td>{o.id}</td>
                                <td>{user ? user.username : 'Unknown'} ({o.userId})</td>
                                <td>{o.cost.toLocaleString()} MMK</td>
                                <td>{o.paymentMethod}</td>
                                <td>{o.paymentProof ? <button className="button-view-proof" onClick={() => setViewingProof(o.paymentProof as string)}>View</button> : 'N/A'}</td>
                                <td><span className={`status-badge status-${o.status.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>{o.status}</span></td>
                                <td>{new Date(o.date).toLocaleString()}</td>
                                 <td className="admin-actions">
                                    {o.status === 'Pending Approval' ? <>
                                        <button onClick={() => handleApproval(o)} className="button-success">Approve</button>
                                        <button onClick={() => handleDecline(o)} className="button-danger">Decline</button>
                                    </> : (o.actionBy || 'N/A')}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="admin-order-view">
            <h2>All User Orders</h2>
            <CollapsibleSection title={`Pending Product Orders (${pendingProductOrders.length})`} startOpen={true}>{pendingProductOrders.length > 0 ? renderProductOrderTable(pendingProductOrders) : renderEmptyState('No pending product orders')}</CollapsibleSection>
            <CollapsibleSection title={`Pending Payment Requests (${pendingPaymentRequests.length})`} startOpen={true}>{pendingPaymentRequests.length > 0 ? renderPaymentRequestTable(pendingPaymentRequests) : renderEmptyState('No pending payment requests')}</CollapsibleSection>
            <CollapsibleSection title={`Approved Product Orders (${approvedProductOrders.length})`}>{approvedProductOrders.length > 0 ? renderProductOrderTable(approvedProductOrders) : renderEmptyState('No approved product orders')}</CollapsibleSection>
            <CollapsibleSection title={`Declined Product Orders (${declinedProductOrders.length})`}>{declinedProductOrders.length > 0 ? renderProductOrderTable(declinedProductOrders) : renderEmptyState('No declined product orders')}</CollapsibleSection>
            <CollapsibleSection title={`Approved Payment Requests (${approvedPaymentRequests.length})`}>{approvedPaymentRequests.length > 0 ? renderPaymentRequestTable(approvedPaymentRequests) : renderEmptyState('No approved payment requests')}</CollapsibleSection>
            <CollapsibleSection title={`Declined Payment Requests (${declinedPaymentRequests.length})`}>{declinedPaymentRequests.length > 0 ? renderPaymentRequestTable(declinedPaymentRequests) : renderEmptyState('No declined payment requests')}</CollapsibleSection>
            {viewingProof && <div className="modal-backdrop" onClick={() => setViewingProof(null)}><div className="modal-content proof-modal" onClick={e => e.stopPropagation()}><img src={viewingProof} alt="Payment Proof" /><button onClick={() => setViewingProof(null)} className="submit-button">Close</button></div></div>}
        </div>
    );
};

const AdminSiteSettings: React.FC<{
    paymentDetails: PaymentAccountDetails,
    setPaymentDetails: React.Dispatch<React.SetStateAction<PaymentAccountDetails>>,
    adminContact: string,
    setAdminContact: React.Dispatch<React.SetStateAction<string>>
}> = ({ paymentDetails, setPaymentDetails, adminContact, setAdminContact }) => {
    
    const [localDetails, setLocalDetails] = useState(paymentDetails);
    const [localContact, setLocalContact] = useState(adminContact);

    const handleDetailChange = (method: string, field: 'name' | 'number', value: string) => {
        setLocalDetails(prev => ({
            ...prev,
            [method]: { ...prev[method], [field]: value }
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPaymentDetails(localDetails);
        setAdminContact(localContact);
        alert('Site settings have been updated successfully!');
    };

    return (
        <div>
            <h2>Site Settings</h2>
            <div className="settings-container">
                <form className="settings-form" onSubmit={handleSubmit}>
                    <h3>Payment Accounts</h3>
                    <div className="input-group">
                        <label htmlFor="kpay-name">KPay Account Name</label>
                        <input id="kpay-name" type="text" className="input-field" value={localDetails['KPay']?.name || ''} onChange={e => handleDetailChange('KPay', 'name', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label htmlFor="kpay-number">KPay Account Number</label>
                        <input id="kpay-number" type="text" className="input-field" value={localDetails['KPay']?.number || ''} onChange={e => handleDetailChange('KPay', 'number', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label htmlFor="wave-name">Wave Pay Account Name</label>
                        <input id="wave-name" type="text" className="input-field" value={localDetails['Wave Pay']?.name || ''} onChange={e => handleDetailChange('Wave Pay', 'name', e.target.value)} />
                    </div>
                     <div className="input-group">
                        <label htmlFor="wave-number">Wave Pay Account Number</label>
                        <input id="wave-number" type="text" className="input-field" value={localDetails['Wave Pay']?.number || ''} onChange={e => handleDetailChange('Wave Pay', 'number', e.target.value)} />
                    </div>
                    
                    <h3>Support & Contact</h3>
                    <div className="input-group">
                        <label htmlFor="admin-contact">Admin Contact URL</label>
                        <input id="admin-contact" type="text" className="input-field" value={localContact} onChange={e => setLocalContact(e.target.value)} />
                    </div>

                    <button type="submit" className="submit-button">Save Changes</button>
                </form>
            </div>
        </div>
    );
};


export default AdminPanel;