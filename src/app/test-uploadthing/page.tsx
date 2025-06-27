"use client";

import { UploadButton, UploadDropzone } from "@/utils/uploadthing";

export default function TestUploadthingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 space-y-8">
      <h1 className="text-2xl font-bold">Uploadthing Test Page</h1>
      
      <div className="space-y-6 w-full max-w-md">
        <div>
          <h2 className="text-lg font-semibold mb-4">Screenshot Upload Test</h2>
          <UploadButton
            endpoint="tabScreenshot"
            onClientUploadComplete={(res) => {
              console.log("Screenshot upload completed:", res);
              alert(`Screenshot uploaded! URL: ${res[0]?.url}`);
            }}
            onUploadError={(error: Error) => {
              console.error("Screenshot upload error:", error);
              alert(`Upload Error: ${error.message}`);
            }}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Tab Import File Test</h2>
          <UploadDropzone
            endpoint="tabImport"
            onClientUploadComplete={(res) => {
              console.log("Tab import upload completed:", res);
              alert(`File uploaded! URL: ${res[0]?.url}`);
            }}
            onUploadError={(error: Error) => {
              console.error("Tab import upload error:", error);
              alert(`Upload Error: ${error.message}`);
            }}
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ul className="text-sm space-y-1">
          <li>• Upload an image file using the screenshot uploader</li>
          <li>• Upload a .txt or .html file using the tab import uploader</li>
          <li>• Check the console for detailed logs</li>
          <li>• Verify files appear in your Uploadthing dashboard</li>
        </ul>
      </div>
    </main>
  );
}