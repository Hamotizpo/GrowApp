export interface Plant {
  id?: string;
  userId: string;
  species: string;
  moisture: number; // 0-100
  sunlight: 'Low Light' | 'Partial Shade' | 'Full Sun';
  status: 'Stable' | 'Thirsty' | 'Critical';
  temp?: number;
  imageUrl?: string;
  createdAt?: number;
}

export interface GrowthLog {
  id?: string;
  plantId: string;
  userId: string;
  date: number;
  note: string;
  height?: number; // in cm
  healthScore?: number; // 1-10
  imageUrl?: string;
}
