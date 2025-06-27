import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if UploadThing token is configured
    const hasToken = !!process.env.UPLOADTHING_TOKEN;
    
    // Get package versions
    const uploadthingVersion = require('uploadthing/package.json').version;
    const reactUploadthingVersion = require('@uploadthing/react/package.json').version;
    
    return NextResponse.json({
      status: 'ok',
      uploadthing: {
        hasToken,
        sdkVersion: uploadthingVersion,
        reactVersion: reactUploadthingVersion,
        provider: process.env.STORAGE_PROVIDER || 'local'
      },
      message: 'UploadThing SDK status check'
    });
  } catch (error) {
    console.error('UploadThing status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check UploadThing status' },
      { status: 500 }
    );
  }
}