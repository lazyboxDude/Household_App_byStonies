export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  price?: number;
  store?: string;
}

export interface SaleOffer {
  title: string;
  price: string;
  image?: string;
  category?: string;
}
