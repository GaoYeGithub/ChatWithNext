import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Box, TextField, Paper, Typography, IconButton, Input } from '@mui/material'
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'

interface Message {
  id: number
  content: string
  user_id: string
  created_at: string
  file_url?: string
}

export default function Chat({ roomId }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [editingMessage, setEditingMessage] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  useEffect(() => {
    fetchMessages()
    const messageSubscription = supabase
      .channel(`messages:room_id=eq.${roomId}`)
      .on('INSERT', (payload: { new: Message }) => {
        setMessages((currentMessages) => [payload.new, ...currentMessages])
      })
      .on('UPDATE', (payload: { new: Message }) => {
        setMessages((currentMessages) =>
          currentMessages.map((msg) =>
            msg.id === payload.new.id ? payload.new : msg
          )
        )
      })
      .on('DELETE', (payload: { old: Message }) => {
        setMessages((currentMessages) =>
          currentMessages.filter((msg) => msg.id !== payload.old.id)
        )
      })
      .subscribe()

    const typingSubscription = supabase
      .channel(`typing:room_id=eq.${roomId}`)
      .on('INSERT', (payload) => {
        setTypingUsers((current) => [...current, payload.new.user_id])
      })
      .on('DELETE', (payload) => {
        setTypingUsers((current) =>
          current.filter((userId) => userId !== payload.old.user_id)
        )
      })
      .subscribe()

    return () => {
      messageSubscription.unsubscribe()
      typingSubscription.unsubscribe()
    }
  }, [roomId])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching messages:', error)
    else setMessages(data || [])
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let fileUrl = ''
    if (file) {
      const { data, error } = await supabase.storage
        .from('message-files')
        .upload(`${user.id}/${file.name}`, file)
      if (error) {
        console.error('Error uploading file:', error)
      } else {
        fileUrl = data.path
      }
    }

    const { error } = await supabase
      .from('messages')
      .insert({ content: newMessage, user_id: user.id, room_id: roomId, file_url: fileUrl })
    if (error) console.error('Error sending message:', error)
    else {
      setNewMessage('')
      setFile(null)
    }
  }

  const editMessage = async (messageId: number, newContent: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId)
    if (error) console.error('Error editing message:', error)
    else setEditingMessage(null)
  }

  const deleteMessage = async (messageId: number) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
    if (error) console.error('Error deleting message:', error)
  }

  const handleTyping = async () => {
    if (!isTyping) {
      setIsTyping(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('typing_indicators')
          .insert({ user_id: user.id, room_id: roomId })
        setTimeout(async () => {
          await supabase
            .from('typing_indicators')
            .delete()
            .eq('user_id', user.id)
            .eq('room_id', roomId)
          setIsTyping(false)
        }, 3000)
      }
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message) => (
          <Paper key={message.id} elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="body1">{message.content}</Typography>
            {message.file_url && (
              <Box component="img" src={message.file_url} alt="Uploaded file" sx={{ maxWidth: '100%', mt: 1 }} />
            )}
            <IconButton onClick={() => setEditingMessage(message.id)}>
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => deleteMessage(message.id)}>
              <DeleteIcon />
            </IconButton>
          </Paper>
        ))}
      </Box>
      {typingUsers.length > 0 && (
        <Typography variant="caption" sx={{ p: 1 }}>
          {typingUsers.join(', ')} is typing...
        </Typography>
      )}
      <Box component="form" onSubmit={sendMessage} sx={{ p: 2, backgroundColor: 'background.default' }}>
        <TextField
          fullWidth
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleTyping}
          placeholder="Type a message"
          variant="outlined"
        />
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </Box>
    </Box>
  )
}