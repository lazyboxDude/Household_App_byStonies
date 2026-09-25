export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  price: number | null;
  store: string | null;
}

export interface SaleOffer {
  title: string;
  price: string;
  image?: string;
  category?: string;
  link?: string;
}
