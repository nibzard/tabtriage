'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Info, Shield, Database, Link2, Eye } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface UrlSanitizationSettingsProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  showStats?: boolean
  stats?: {
    totalUrls: number
    sanitizedUrls: number
    parametersSaved: number
    storageReduced: string
  }
}

export function UrlSanitizationSettings({
  enabled,
  onToggle,
  showStats = false,
  stats
}: UrlSanitizationSettingsProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base text-blue-900">
              URL Sanitization
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Recommended
            </Badge>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-blue-700">
          <p>
            Automatically clean URLs by removing tracking parameters, session tokens, 
            and other unnecessary data while preserving functionality.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700">Better Privacy</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700">Cleaner URLs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700">Less Storage</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700">No Tracking</span>
          </div>
        </div>

        {/* Statistics */}
        {showStats && stats && (
          <div className="pt-2 border-t border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-900">URLs Processed</div>
                <div className="text-blue-700">{stats.totalUrls.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-medium text-blue-900">URLs Cleaned</div>
                <div className="text-blue-700">{stats.sanitizedUrls.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-medium text-blue-900">Parameters Removed</div>
                <div className="text-blue-700">{stats.parametersSaved.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-medium text-blue-900">Storage Saved</div>
                <div className="text-blue-700">{stats.storageReduced}</div>
              </div>
            </div>
          </div>
        )}

        {/* Expandable details */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <Info className="h-4 w-4" />
            {showDetails ? 'Hide Details' : 'What gets removed?'}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3">
            <div className="space-y-3 text-sm text-blue-700">
              <div>
                <div className="font-medium mb-1">Tracking Parameters:</div>
                <div className="text-xs bg-blue-100 p-2 rounded font-mono">
                  utm_source, utm_medium, fbclid, gclid, sharing_token, etc.
                </div>
              </div>
              
              <div>
                <div className="font-medium mb-1">Example Transformation:</div>
                <div className="space-y-1">
                  <div className="text-xs">
                    <span className="text-red-600">Before:</span>
                    <code className="bg-red-50 px-1 rounded text-xs break-all">
                      example.com/article?utm_source=facebook&amp;sharing_token=abc123...
                    </code>
                  </div>
                  <div className="text-xs">
                    <span className="text-green-600">After:</span>
                    <code className="bg-green-50 px-1 rounded text-xs">
                      example.com/article
                    </code>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-1">Protected URLs:</div>
                <div className="text-xs">
                  Academic links (DOI, arXiv, PubMed), GitHub, and other functional URLs 
                  are preserved to maintain their functionality.
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}