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

    return NextResponse.json({ offers, debug_html_length: html.length });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}
