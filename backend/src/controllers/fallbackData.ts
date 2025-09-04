// Fallback data when database is unavailable
export const fallbackUsers = [
  {
    id: 123456,
    username: 'tw',
    password: '$2b$12$oWve31DF4cGCa5eJw.9SrOYFrSWkmeun9b2/2wIyepruDoyRJjYXe', // hashed: Kp@794628
    isAdmin: true,
    credits: 1000000,
    securityAmount: 50000,
    banned: false,
    notifications: ['Welcome to Atom Point Web! (Admin Account)'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 789012,
    username: 'testuser',
    password: '$2b$12$rQd5sh6szYGLGDVeFBnI8.2HJT8R8Ue8yF4AkBs.3Rvx5hF5vJ8SZW', // hashed: test123
    isAdmin: false,
    credits: 500,
    securityAmount: 5000,
    banned: false,
    notifications: ['Welcome to Atom Point Web!'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const fallbackProducts = [
  { id: 1, operator: 'MPT', category: 'Recharge', name: '1000 MMK', priceMMK: 1000, priceCr: 100, available: true },
  { id: 2, operator: 'MPT', category: 'Recharge', name: '3000 MMK', priceMMK: 3000, priceCr: 300, available: true },
  { id: 3, operator: 'Ooredoo', category: 'Recharge', name: '1000 MMK', priceMMK: 1000, priceCr: 100, available: true },
  { id: 4, operator: 'Telenor', category: 'Data', name: '1GB Daily', priceMMK: 800, priceCr: 80, available: true }
];

export const fallbackOrders: any[] = [];

export const fallbackPaymentDetails = {
  'KPay': { name: 'ATOM Point Admin', number: '09 987 654 321' },
  'Wave Pay': { name: 'ATOM Point Services', number: '09 123 456 789' }
};

export const fallbackSettings = {
  adminContact: 'https://t.me/CEO_METAVERSE'
};