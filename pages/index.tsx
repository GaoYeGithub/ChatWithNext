import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Chat from '../components/Chat'
import { AppBar, Toolbar, Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'

export default function Home() {
  const [user, setUser] = useState(null)
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) router.push('/auth')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleCreateRoom = async () => {
    const { error } = await supabase.from('rooms').insert({ name: newRoomName })
    if (error) console.error('Error creating room:', error)
    else {
      setIsCreateRoomDialogOpen(false)
      setNewRoomName('')
    }
  }

  if (!user) return null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Chat App
          </Typography>
          <Button color="inherit" onClick={() => setIsCreateRoomDialogOpen(true)}>
            Create Room
          </Button>
          <Button color="inherit" onClick={handleSignOut}>
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Chat />
      </Box>
      <Dialog open={isCreateRoomDialogOpen} onClose={() => setIsCreateRoomDialogOpen(false)}>
        <DialogTitle>Create New Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            variant="outlined"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateRoomDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRoom}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}