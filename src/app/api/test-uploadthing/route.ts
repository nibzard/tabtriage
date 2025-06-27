import { NextResponse } from 'next/server';
import { uploadToUploadthing } from '@/services/uploadthingService';

export async function GET() {
  try {
    // Test environment variables
    const hasToken = !!process.env.UPLOADTHING_TOKEN;
    const tokenPreview = process.env.UPLOADTHING_TOKEN 
      ? `${process.env.UPLOADTHING_TOKEN.slice(0, 20)}...` 
      : 'Not set';

    return NextResponse.json({
      status: 'ok',
      uploadthing: {
        hasToken,
        tokenPreview,
        provider: process.env.STORAGE_PROVIDER || 'local'
      },
      message: 'Uploadthing configuration test'
    });
  } catch (error) {
    console.error('Uploadthing test error:', error);
    return NextResponse.json(
      { error: 'Failed to test Uploadthing configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Testing file upload:', file.name, file.type, file.size);

    // Test upload
    const result = await uploadToUploadthing(file, file.name, 'tabImport');
    
    if (result) {
      return NextResponse.json({
        success: true,
        file: result,
        message: 'File uploaded successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload test error:', error);
    return NextResponse.json(
      { error: 'Upload test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}