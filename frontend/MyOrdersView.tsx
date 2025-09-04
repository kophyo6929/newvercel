import React, { useState } from 'react';
import { User, Order } from './types';
import { Logo, EmptyState } from './components';
import { useLanguage } from './i18n';

interface MyOrdersViewProps {
    user: User;
    orders: Order[];
    onNavigate: (view: string) => void;
}

const MyOrdersView = ({ user, orders, onNavigate }: MyOrdersViewProps) => {
    const { t } = useLanguage();
    const [statusFilter, setStatusFilter] = useState('All');
    
    const filterOptions = [
        { key: 'All', label: t('myOrders.filters.all') },
        { key: 'Pending Approval', label: t('myOrders.filters.pending') },
        { key: 'Completed', label: t('myOrders.filters.completed') },
        { key: 'Declined', label: t('myOrders.filters.declined') }
    ];
    
    const userOrders = orders.filter(o => o.userId === user.id);

    const filteredOrders = userOrders
        .filter(o => statusFilter === 'All' || o.status === statusFilter)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="generic-view-container">
            <header className="dashboard-header">
                <Logo />
                <button onClick={() => onNavigate('DASHBOARD')} className="logout-button">{t('common.backToDashboard')}</button>
            </header>
            <main className="dashboard-main">
                <div className="nav-header">
                   <button onClick={() => onNavigate('DASHBOARD')} className="back-button">← {t('common.back')}</button>
                    <h3>{t('myOrders.title')}</h3>
                </div>

                {userOrders.length > 0 ? (
                    <>
                        <div className="order-filters">
                            {filterOptions.map(opt => (
                                <button 
                                    key={opt.key}
                                    className={`filter-btn ${statusFilter === opt.key ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(opt.key)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="order-list">
                            {filteredOrders.length > 0 ? filteredOrders.map(o => (
                                <div key={o.id} className="order-item">
                                    <div className="order-info">
                                        <h4>{o.product.name}</h4>
                                        <p>{t('myOrders.orderId')} {o.id}</p>
                                        <p>{t('myOrders.date')} {new Date(o.date).toLocaleString()}</p>
                                        {o.deliveryInfo && <p>{t('myOrders.deliveredTo')} {o.deliveryInfo}</p>}
                                        {o.paymentMethod && <p>{t('myOrders.paymentVia')} {o.paymentMethod}</p>}
                                    </div>
                                    <div className="order-details">
                                        <span className={`status-badge status-${o.status.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>{o.status}</span>
                                        <p className="order-cost">
                                            {o.id.startsWith('PROD') ? `${o.cost.toFixed(2)} C` : `${o.cost.toLocaleString()} MMK`}
                                        </p>
                                    </div>
                                </div>
                            )) : <EmptyState message={t('myOrders.emptyFilterTitle')} subMessage={t('myOrders.emptyFilterSubtitle')} />}
                        </div>
                    </>
                ) : (
                     <EmptyState 
                        message={t('myOrders.emptyTitle')}
                        subMessage={t('myOrders.emptySubtitle')}
                    />
                )}
            </main>
        </div>
    );
};

export default MyOrdersView;