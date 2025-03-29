import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/utils/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test Supabase connection
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10)

    if (profilesError) {
      return res.status(500).json({
        success: false,
        message: 'Error connecting to profiles table',
        error: profilesError
      })
    }

    // Test folders table
    const { data: foldersData, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .limit(10)

    // Test tabs table
    const { data: tabsData, error: tabsError } = await supabase
      .from('tabs')
      .select('*')
      .limit(10)

    // Test storage
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .getBucket('tab-screenshots')

    return res.status(200).json({
      success: true,
      message: 'Supabase connection successful',
      data: {
        profiles: {
          success: !profilesError,
          count: profilesData?.length || 0,
          data: profilesData
        },
        folders: {
          success: !foldersError,
          count: foldersData?.length || 0,
          error: foldersError
        },
        tabs: {
          success: !tabsError,
          count: tabsData?.length || 0,
          error: tabsError
        },
        storage: {
          success: !bucketError,
          bucket: bucketData,
          error: bucketError
        }
      }
    })
  } catch (error) {
    console.error('Error testing Supabase connection:', error)
    return res.status(500).json({
      success: false,
      message: 'Error testing Supabase connection',
      error
    })
  }
}