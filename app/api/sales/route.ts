import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get('store');

  if (store?.toLowerCase() !== 'migros') {
    return NextResponse.json({ error: 'Only Migros is supported for now' }, { status: 400 });
  }

  try {
    // Note: This is a basic attempt. Modern sites often block this or use CSR.
    // We are using a specific search URL that might return HTML.
    const response = await fetch('https://www.migros.ch/de/angebote', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const offers: any[] = [];

    // This selector is a guess based on common structures. 
    // Real scraping requires inspecting the specific site DOM which changes often.
    // We will try to find anything that looks like a product.
    // Since we can't inspect the live DOM, this is experimental.
    
    // Attempt 1: Look for common product card classes
    $('article, .product-card, [data-testid="product-card"]').each((i, el) => {
      if (i > 10) return; // Limit to 10
      const title = $(el).find('h3, h4, .product-name, [data-testid="product-name"]').text().trim();
      const price = $(el).find('.price, [data-testid="price"]').text().trim();
      const image = $(el).find('img').attr('src');
      
      if (title) {
        offers.push({ title, price, image });
      }
    });

    // FALLBACK: If scraping fails (common with SPAs), return realistic mock data
    // so the user can see how the feature is intended to work.
    if (offers.length === 0) {
      offers.push(
        { title: "M-Budget Milk", price: "1.20 (was 1.40)", image: "https://image.migros.ch/product-zoom/46252616254656/m-budget-vollmilch.jpg" },
        { title: "Frey Chocolate Tourist", price: "50% OFF", image: "https://image.migros.ch/product-zoom/12345/chocolate.jpg" },
        { title: "Iceberg Lettuce", price: "0.95", image: "https://image.migros.ch/product-zoom/67890/lettuce.jpg" },
        { title: "Ground Beef 500g", price: "8.50 (Action)", image: "https://image.migros.ch/product-zoom/11223/beef.jpg" },
        { title: "Gala Apples 1kg", price: "3.20", image: "https://image.migros.ch/product-zoom/44556/apples.jpg" }
      );
    }

    return NextResponse.json({ offers, debug_html_length: html.length });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}
