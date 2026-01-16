'use client'

import { useState } from 'react'
import { ConversationList } from '@/components/sidebar/conversation-list'
import { ChatArea } from '@/components/chat/chat-area'
import { useConversationStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { selectedConversation } = useConversationStore()
  const [showChat, setShowChat] = useState(false)

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div
        className={cn(
          'w-full md:w-96 md:block flex-shrink-0',
          selectedConversation && showChat ? 'hidden md:block' : 'block'
        )}
      >
        <ConversationList onSelectConversation={() => setShowChat(true)} />
      </div>

      {/* Chat Area */}
      <div
        className={cn(
          'flex-1 min-w-0',
          selectedConversation && showChat ? 'block' : 'hidden md:block'
        )}
      >
        <ChatArea onBack={() => setShowChat(false)} />
      </div>
    </div>
  )
}
