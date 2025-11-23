import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get('store');

  try {
    // Mock data for demonstration purposes
    const offers = [
      { 
        title: "M-Budget Milk Drink", 
        price: "1.20 (was 1.40)", 
        image: "https://image.migros.ch/product-zoom/46252616254656/m-budget-vollmilch.jpg", 
        category: "Dairy",
        link: "https://www.migros.ch/de/product/204017500000"
      },
      { 
        title: "Frey Chocolate Tourist", 
        price: "50% OFF", 
        image: "https://image.migros.ch/product-zoom/12345/chocolate.jpg", 
        category: "Sweets",
        link: "https://www.migros.ch/de/brand/chocolat-frey"
      },
      { 
        title: "Iceberg Lettuce", 
        price: "0.95", 
        image: "https://image.migros.ch/product-zoom/67890/lettuce.jpg", 
        category: "Fruits & Vegetables",
        link: "https://www.migros.ch/de/product/130301400000"
      },
      { 
        title: "Ground Beef 500g", 
        price: "8.50 (Action)", 
        image: "https://image.migros.ch/product-zoom/11223/beef.jpg", 
        category: "Meat",
        link: "https://www.migros.ch/de/product/230106500000"
      },
      { 
        title: "Gala Apples 1kg", 
        price: "3.20", 
        image: "https://image.migros.ch/product-zoom/44556/apples.jpg", 
        category: "Fruits & Vegetables",
        link: "https://www.migros.ch/de/product/131035000000"
      },
      { 
        title: "Butter Gipfel", 
        price: "1.10", 
        image: "", 
        category: "Bakery",
        link: "https://www.migros.ch/de/product/111000100000"
      }
    ];

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}
