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
