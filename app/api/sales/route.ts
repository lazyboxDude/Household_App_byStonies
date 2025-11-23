import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get('store');

  if (store?.toLowerCase() !== 'migros') {
    return NextResponse.json({ error: 'Only Migros is supported for now' }, { status: 400 });
  }

  try {
    // We will scrape 'aktionis.ch' which aggregates offers and is easier to parse than the official SPAs.
    const vendorMap: Record<string, string> = {
      'migros': 'migros',
      'coop': 'coop',
      'denner': 'denner',
      'aldi': 'aldi-suisse',
      'lidl': 'lidl'
    };

    const vendorSlug = vendorMap[store?.toLowerCase() || 'migros'] || 'migros';
    const url = `https://www.aktionis.ch/vendors/${vendorSlug}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HouseholdApp/1.0;)'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const offers: any[] = [];

    // Scrape Aktionis.ch structure
    $('.search-result-item, .offer-item, article').each((i, el) => {
      if (i > 20) return; // Limit results

      const title = $(el).find('h3, .title, .offer-title').text().trim();
      const priceNew = $(el).find('.price-new, .current-price').text().trim();
      const priceOld = $(el).find('.price-old, .original-price').text().trim();
      
      // Construct price string
      let price = priceNew;
      if (priceOld) {
        price = `${priceNew} (was ${priceOld})`;
      } else if (!price) {
        price = "See details";
      }

      // Image
      let image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
      if (image && !image.startsWith('http')) {
        image = `https://www.aktionis.ch${image}`;
      }

      // Link
      let link = $(el).find('a').attr('href');
      if (link && !link.startsWith('http')) {
        link = `https://www.aktionis.ch${link}`;
      }

      // Simple category inference
      let category = "Groceries";
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.match(/milk|cheese|yogurt|butter|cream/)) category = "Dairy";
      else if (lowerTitle.match(/bread|croissant|bun|cake/)) category = "Bakery";
      else if (lowerTitle.match(/apple|banana|lettuce|tomato|potato|fruit|veg/)) category = "Fruits & Vegetables";
      else if (lowerTitle.match(/beef|chicken|pork|meat|fish/)) category = "Meat";
      else if (lowerTitle.match(/chocolate|cookie|candy|sweet/)) category = "Sweets";

      if (title) {
        offers.push({ title, price, image, link, category });
      }
    });

    // FALLBACK: Only if scraping completely fails
    if (offers.length === 0) {
      // ... keep existing fallback or simplify ...
      console.log("Scraping failed, using fallback");
      offers.push(
        { 
          title: "M-Budget Milk Drink", 
          price: "1.20", 
          image: "https://image.migros.ch/product-zoom/46252616254656/m-budget-vollmilch.jpg", 
          category: "Dairy",
          link: "https://www.migros.ch/de/product/204017500000"
        }
      );
    }

    return NextResponse.json({ offers, debug_html_length: html.length });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}
