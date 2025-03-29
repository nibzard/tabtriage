'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Tab } from '@/types/Tab'
import { Folder } from '@/types/Folder'
import { getTabs, saveTabs, getFolders, saveFolders } from '@/services/tabService'
import { folders as defaultFolders } from '@/data/mockData'
import { logger } from '@/utils/logger'
import {
  supabase,
  saveTabToDatabase,
  getUserTabs,
  deleteTab as deleteTabFromDb,
  saveFolderToDatabase,
  getUserFolders
} from '@/utils/supabase'

interface TabContextType {
  tabs: Tab[]
  folders: Folder[]
  addTabs: (newTabs: Tab[]) => void
  updateTab: (tabId: string, updates: Partial<Tab>) => void
  deleteTab: (tabId: string) => void
  deleteAllDiscarded: () => void
  keepTab: (tabId: string) => void
  discardTab: (tabId: string) => void
  assignToFolder: (tabId: string, folderId: string) => void
  createFolder: (name: string) => Folder
  deleteFolder: (folderId: string) => void
  isLoading: boolean
}

const TabContext = createContext<TabContextType | undefined>(undefined)

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // In a real app, this would come from authentication
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const initUser = async () => {
      try {
        // First check if we have a stored user ID
        const storedUserId = localStorage.getItem('tabtriage_user_id')

        if (storedUserId) {
          console.log('Using stored user ID:', storedUserId)
          setUserId(storedUserId)
          return
        }

        // If not, try to get a test profile from Supabase
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)

        if (error) {
          console.error('Error fetching profiles:', error)
          // Fall back to a local ID
          const fallbackId = `user-${Date.now()}`
          localStorage.setItem('tabtriage_user_id', fallbackId)
          setUserId(fallbackId)
          return
        }

        if (data && data.length > 0) {
          // Use the first profile
          const profileId = data[0].id
          console.log('Using existing profile ID:', profileId)
          localStorage.setItem('tabtriage_user_id', profileId)
          setUserId(profileId)
        } else {
          // Create a new profile
          console.log('No profiles found, creating a new one')
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({ email: `user-${Date.now()}@example.com`, display_name: 'Test User' })
            .select()

          if (insertError || !newProfile || newProfile.length === 0) {
            console.error('Error creating profile:', insertError)
            // Fall back to a local ID
            const fallbackId = `user-${Date.now()}`
            localStorage.setItem('tabtriage_user_id', fallbackId)
            setUserId(fallbackId)
          } else {
            // Use the new profile
            const newProfileId = newProfile[0].id
            console.log('Created new profile ID:', newProfileId)
            localStorage.setItem('tabtriage_user_id', newProfileId)
            setUserId(newProfileId)
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error)
        // Fall back to a local ID
        const fallbackId = `user-${Date.now()}`
        localStorage.setItem('tabtriage_user_id', fallbackId)
        setUserId(fallbackId)
      }
    }

    initUser()
  }, [])

  // Load data from localStorage and Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // First load from localStorage for immediate display
        const storedTabs = getTabs()
        const storedFolders = getFolders()
        setTabs(storedTabs.length > 0 ? storedTabs : [])
        setFolders(storedFolders.length > 0 ? storedFolders : defaultFolders)

        // Then try to fetch from Supabase if we have a userId
        if (userId) {
          logger.info(`Fetching data from Supabase for user: ${userId}`)
          try {
            const dbTabs = await getUserTabs(userId)
            const dbFolders = await getUserFolders(userId)

            if (dbTabs.length > 0) {
              logger.info(`Loaded ${dbTabs.length} tabs from Supabase`)
              setTabs(dbTabs)
            } else {
              logger.info('No tabs found in Supabase, using localStorage data')
              // If no tabs in Supabase but we have local tabs, save them to Supabase
              if (storedTabs.length > 0) {
                logger.info(`Saving ${storedTabs.length} local tabs to Supabase`)
                storedTabs.forEach(tab => {
                  saveTabToDatabase(tab, userId)
                })
              }
            }

            if (dbFolders.length > 0) {
              logger.info(`Loaded ${dbFolders.length} folders from Supabase`)
              setFolders(dbFolders)
            } else {
              logger.info('No folders found in Supabase, using default folders')
              // Save default folders to Supabase
              defaultFolders.forEach(folder => {
                saveFolderToDatabase(folder, userId)
              })
            }
          } catch (supabaseError) {
            logger.error('Error fetching from Supabase:', supabaseError)
          }
        }
      } catch (error) {
        logger.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [userId])

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveTabs(tabs)

      // Save to Supabase
      if (userId) {
        tabs.forEach(tab => {
          saveTabToDatabase(tab, userId)
            .then(id => {
              if (id) {
                logger.debug(`Tab saved to Supabase: ${id}`)
              } else {
                logger.error(`Failed to save tab to Supabase: ${tab.id}`)
              }
            })
            .catch(error => {
              logger.error(`Error saving tab to Supabase: ${error}`)
            })
        })
      }
    }
  }, [tabs, isLoading, userId])

  // Save folders to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveFolders(folders)

      // Save to Supabase
      if (userId) {
        folders.forEach(folder => {
          saveFolderToDatabase(folder, userId)
            .then(id => {
              if (id) {
                logger.debug(`Folder saved to Supabase: ${id}`)
              } else {
                logger.error(`Failed to save folder to Supabase: ${folder.id}`)
              }
            })
            .catch(error => {
              logger.error(`Error saving folder to Supabase: ${error}`)
            })
        })
      }
    }
  }, [folders, isLoading, userId])

  const addTabs = (newTabs: Tab[]) => {
    logger.info(`Adding ${newTabs.length} new tabs`)

    setTabs(prevTabs => {
      // Filter out duplicates based on URL
      const existingUrls = new Set(prevTabs.map(tab => tab.url))
      const uniqueNewTabs = newTabs.filter(tab => !existingUrls.has(tab.url))

      logger.info(`${uniqueNewTabs.length} unique tabs will be added`)
      return [...prevTabs, ...uniqueNewTabs]
    })
  }

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    logger.debug(`Updating tab: ${tabId}`)

    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    )
  }

  const deleteTab = (tabId: string) => {
    logger.debug(`Deleting tab: ${tabId}`)

    // Delete from Supabase
    if (userId) {
      deleteTabFromDb(tabId)
        .then(success => {
          if (success) {
            logger.debug(`Tab deleted from Supabase: ${tabId}`)
          } else {
            logger.error(`Failed to delete tab from Supabase: ${tabId}`)
          }
        })
        .catch(error => {
          logger.error(`Error deleting tab from Supabase: ${error}`)
        })
    }

    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId))
  }

  const deleteAllDiscarded = () => {
    logger.debug('Deleting all discarded tabs')

    const discardedTabs = tabs.filter(tab => tab.status === 'discarded')

    // Delete from Supabase
    if (userId) {
      discardedTabs.forEach(tab => {
        deleteTabFromDb(tab.id)
          .then(success => {
            if (success) {
              logger.debug(`Tab deleted from Supabase: ${tab.id}`)
            } else {
              logger.error(`Failed to delete tab from Supabase: ${tab.id}`)
            }
          })
          .catch(error => {
            logger.error(`Error deleting tab from Supabase: ${error}`)
          })
      })
    }

    setTabs(prevTabs => prevTabs.filter(tab => tab.status !== 'discarded'))
  }

  const keepTab = (tabId: string) => {
    logger.debug(`Keeping tab: ${tabId}`)

    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, status: 'kept' } : tab
      )
    )
  }

  const discardTab = (tabId: string) => {
    logger.debug(`Discarding tab: ${tabId}`)

    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, status: 'discarded' } : tab
      )
    )
  }

  const assignToFolder = (tabId: string, folderId: string) => {
    logger.debug(`Assigning tab ${tabId} to folder ${folderId}`)

    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, folderId, status: 'kept' } : tab
      )
    )
  }

  const createFolder = (name: string): Folder => {
    logger.debug(`Creating new folder: ${name}`)

    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 45%)`
    }

    // In production, this would save to Supabase
    // if (userId) {
    //   saveFolderToDatabase(newFolder, userId)
    // }

    setFolders(prevFolders => [...prevFolders, newFolder])
    return newFolder
  }

  const deleteFolder = (folderId: string) => {
    logger.debug(`Deleting folder: ${folderId}`)

    // Delete from Supabase
    if (userId) {
      import('@/utils/supabase').then(({ deleteFolder: deleteFolderFromDb }) => {
        deleteFolderFromDb(folderId)
          .then(success => {
            if (success) {
              logger.debug(`Folder deleted from Supabase: ${folderId}`)
            } else {
              logger.error(`Failed to delete folder from Supabase: ${folderId}`)
            }
          })
          .catch(error => {
            logger.error(`Error deleting folder from Supabase: ${error}`)
          })
      })
    }

    // Remove folder
    setFolders(prevFolders => prevFolders.filter(folder => folder.id !== folderId))

    // Update tabs that were in this folder
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.folderId === folderId ? { ...tab, folderId: undefined } : tab
      )
    )
  }

  return (
    <TabContext.Provider value={{
      tabs,
      folders,
      addTabs,
      updateTab,
      deleteTab,
      deleteAllDiscarded,
      keepTab,
      discardTab,
      assignToFolder,
      createFolder,
      deleteFolder,
      isLoading
    }}>
      {children}
    </TabContext.Provider>
  )
}

export function useTabContext() {
  const context = useContext(TabContext)
  if (context === undefined) {
    throw new Error('useTabContext must be used within a TabProvider')
  }
  return context
}