import { NextRequest, NextResponse } from 'next/server';

// Required for static export
export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  // For static export mode, return empty data
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
    return NextResponse.json({ data: [] });
  }
  
  const url = process.env.GOOGLE_SHEETS_OVERALL_CSV_URL;
  if (!url) return NextResponse.json({ error: 'CSV URL not set' }, { status: 500 });

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch CSV' }, { status: 500 });
  } catch (error) {
    console.error('Failed to fetch CSV:', error);
    return NextResponse.json({ error: 'Failed to fetch CSV', details: error }, { status: 500 });
  }

  const csv = await res.text();
  
  // Better CSV parsing that handles quoted fields with commas
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  const lines = csv.trim().split('\n');
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
  const data = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const entry: any = {};
    headers.forEach((header, i) => { 
      entry[header] = values[i] ? values[i].replace(/"/g, '').trim() : '';
    });
    return entry;
  });

  return NextResponse.json({ data });
}
