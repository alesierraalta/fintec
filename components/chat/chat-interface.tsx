'use client';

import { useChat, type UIMessage as Message } from '@ai-sdk/react';
import { MessageBubble } from './message-bubble';



import { SuggestionChips } from './suggestion-chips';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles } from 'lucide-react';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading } = useChat({
    api: '/api/chat',
  } as any) as any;


  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70 mt-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">¿En qué puedo ayudarte hoy?</h2>
            <p className="text-sm text-muted-foreground max-w-md px-4">
              Soy tu asistente financiero inteligente. Puedo crear transacciones, analizar tus gastos y responder preguntas sobre tu dinero.
            </p>
            <SuggestionChips onSelect={handleSuggestionClick} />
          </div>
        )}
        
        {messages.map((m: Message) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start mb-4">
             <div className="bg-muted/50 rounded-2xl px-4 py-3 rounded-bl-none border border-border/50">
               <div className="flex space-x-1 h-6 items-center">
                 <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"></div>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/40 bg-background/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto items-center">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-2xl bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all h-12 shadow-sm"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            className="rounded-full w-12 h-12 shrink-0 shadow-lg hover:shadow-xl transition-all" 
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
