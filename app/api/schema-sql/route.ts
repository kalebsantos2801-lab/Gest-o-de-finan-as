import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'lib', 'supabase-schema.sql');
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(sqlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline; filename="supabase-schema.sql"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao ler o arquivo schema SQL', details: String(error) },
      { status: 500 }
    );
  }
}
