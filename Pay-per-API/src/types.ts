export interface UserProfile {
  uid: string;
  email: string;
  balance: number;
  createdAt: any;
}

export interface ApiListing {
  id: string;
  name: string;
  description: string;
  pricePerCall: number;
  category: string;
  provider: string;
  status: 'active' | 'deprecated';
}

export interface Transaction {
  id: string;
  apiId?: string;
  apiName?: string;
  amount: number;
  type: 'usage' | 'deposit';
  timestamp: any;
}
