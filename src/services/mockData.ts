
// Mock data for the admin dashboard

// Types
export type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  collectionsCreated: number;
  dateJoined: string;
  status: 'active' | 'suspended' | 'flagged';
};

export type Collection = {
  id: string;
  title: string;
  hostName: string;
  hostEmail: string;
  amountRaised: number;
  totalContributors: number;
  status: 'active' | 'completed' | 'closed';
  dateCreated: string;
};

export type Withdrawal = {
  id: string;
  collectionId: string;
  collectionName: string;
  hostName: string;
  hostEmail: string;
  requestedAmount: number;
  dateRequested: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type Transaction = {
  id: string;
  type: 'contribution' | 'withdrawal';
  amount: number;
  status: 'success' | 'failed' | 'flagged' | 'pending';
  date: string;
  user: string;
  collection: string;
};

export type DashboardStats = {
  totalUsers: number;
  totalCollections: number;
  totalContributions: number;
  totalWithdrawals: number;
  approvedWithdrawals: number;
  pendingWithdrawals: number;
  flaggedTransactions: number;
};

// Mock data
const users: User[] = Array(50).fill(null).map((_, i) => ({
  id: `user-${i + 1}`,
  fullName: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  phone: `+234${Math.floor(Math.random() * 1000000000)}`,
  collectionsCreated: Math.floor(Math.random() * 5),
  dateJoined: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
  status: ['active', 'active', 'active', 'active', 'suspended', 'flagged'][Math.floor(Math.random() * 6)] as 'active' | 'suspended' | 'flagged',
}));

const collections: Collection[] = Array(75).fill(null).map((_, i) => ({
  id: `coll-${i + 1}`,
  title: `Collection ${i + 1}`,
  hostName: `User ${Math.floor(Math.random() * 50) + 1}`,
  hostEmail: `user${Math.floor(Math.random() * 50) + 1}@example.com`,
  amountRaised: Math.floor(Math.random() * 1000000),
  totalContributors: Math.floor(Math.random() * 50) + 1,
  status: ['active', 'completed', 'closed'][Math.floor(Math.random() * 3)] as 'active' | 'completed' | 'closed',
  dateCreated: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
}));

const withdrawals: Withdrawal[] = Array(30).fill(null).map((_, i) => ({
  id: `with-${i + 1}`,
  collectionId: `coll-${Math.floor(Math.random() * 75) + 1}`,
  collectionName: `Collection ${Math.floor(Math.random() * 75) + 1}`,
  hostName: `User ${Math.floor(Math.random() * 50) + 1}`,
  hostEmail: `user${Math.floor(Math.random() * 50) + 1}@example.com`,
  requestedAmount: Math.floor(Math.random() * 500000),
  dateRequested: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
  status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)] as 'pending' | 'approved' | 'rejected',
}));

const transactions: Transaction[] = Array(100).fill(null).map((_, i) => ({
  id: `txn-${i + 1}`,
  type: ['contribution', 'withdrawal'][Math.floor(Math.random() * 2)] as 'contribution' | 'withdrawal',
  amount: Math.floor(Math.random() * 100000),
  status: ['success', 'failed', 'flagged', 'pending'][Math.floor(Math.random() * 4)] as 'success' | 'failed' | 'flagged' | 'pending',
  date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
  user: `User ${Math.floor(Math.random() * 50) + 1}`,
  collection: `Collection ${Math.floor(Math.random() * 75) + 1}`,
}));

// Calculate dashboard stats from mock data
const dashboardStats: DashboardStats = {
  totalUsers: users.length,
  totalCollections: collections.length,
  totalContributions: transactions
    .filter(t => t.type === 'contribution' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0),
  totalWithdrawals: withdrawals
    .reduce((sum, w) => sum + w.requestedAmount, 0),
  approvedWithdrawals: withdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + w.requestedAmount, 0),
  pendingWithdrawals: withdrawals
    .filter(w => w.status === 'pending').length,
  flaggedTransactions: transactions
    .filter(t => t.status === 'flagged').length,
};

// Service to fetch the mock data
export const fetchDashboardStats = (): Promise<DashboardStats> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(dashboardStats), 500);
  });
};

export const fetchUsers = (): Promise<User[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(users), 500);
  });
};

export const fetchCollections = (): Promise<Collection[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(collections), 500);
  });
};

export const fetchWithdrawals = (): Promise<Withdrawal[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(withdrawals), 500);
  });
};

export const fetchRecentTransactions = (): Promise<Transaction[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(transactions.slice(0, 10)), 500);
  });
};
