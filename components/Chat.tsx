import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Box, TextField, Paper, Typography } from '@mui/material'

interface Message {
  id: number
  content: string
  user_id: string
  created_at: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    fetchMessages()
    const subscription = supabase
      .channel('messages')
      .on('INSERT', (payload: { new: Message }) => {
        setMessages((currentMessages) => [payload.new, ...currentMessages])
      }, {})
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching messages:', error)
    else setMessages(data || [])
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('messages')
      .insert({ content: newMessage, user_id: user.id })
    if (error) console.error('Error sending message:', error)
    else setNewMessage('')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message) => (
          <Paper key={message.id} elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="body1">{message.content}</Typography>
          </Paper>
        ))}
      </Box>
      <Box component="form" onSubmit={sendMessage} sx={{ p: 2, backgroundColor: 'background.default' }}>
        <TextField
          fullWidth
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
          variant="outlined"
        />
      </Box>
    </Box>
  )
}